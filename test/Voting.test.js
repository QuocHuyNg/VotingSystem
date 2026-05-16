const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Voting Contract", function () {
  let voting;
  let owner, voter1, voter2, voter3, unauthorized;

  const electionName = "Test Election 2025";
  const electionDesc = "A test election";

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, unauthorized] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy();
    await voting.waitForDeployment();
  });

  // ─── Helper ───────────────────────────────────────
  async function createElectionWithCandidates() {
    const now = await time.latest();
    const startTime = now + 60;   // starts in 1 minute
    const endTime = now + 3600;   // ends in 1 hour

    const tx = await voting.createElection(electionName, electionDesc, startTime, endTime);
    const receipt = await tx.wait();
    const electionId = 1n;

    await voting.addCandidate(electionId, "Alice", "Candidate A");
    await voting.addCandidate(electionId, "Bob", "Candidate B");

    return { electionId, startTime, endTime };
  }

  // ─── 1. Create Election ────────────────────────────
  describe("createElection", function () {
    it("Should allow owner to create election", async function () {
      const now = await time.latest();
      await expect(
        voting.createElection("E1", "Desc", now + 60, now + 3600)
      ).to.emit(voting, "ElectionCreated");

      const e = await voting.getElection(1);
      expect(e.name).to.equal("E1");
      expect(e.exists).to.equal(undefined); // read via struct fields
    });

    it("Should reject non-owner", async function () {
      const now = await time.latest();
      await expect(
        voting.connect(voter1).createElection("E1", "Desc", now + 60, now + 3600)
      ).to.be.revertedWith("Only owner can call this");
    });

    it("Should reject invalid time range", async function () {
      const now = await time.latest();
      await expect(
        voting.createElection("E1", "Desc", now + 3600, now + 60)
      ).to.be.revertedWith("End time must be after start time");
    });
  });

  // ─── 2. Add Candidate ─────────────────────────────
  describe("addCandidate", function () {
    it("Should add candidates before election starts", async function () {
      const { electionId } = await createElectionWithCandidates();
      const e = await voting.getElection(electionId);
      expect(e.candidateCount).to.equal(2n);
    });

    it("Should reject adding candidates after election starts", async function () {
      const { electionId, startTime } = await createElectionWithCandidates();
      await time.increaseTo(startTime + 1);
      await expect(
        voting.addCandidate(electionId, "Charlie", "Candidate C")
      ).to.be.revertedWith("Cannot add candidates after election started");
    });
  });

  // ─── 3. Authorize Voter ────────────────────────────
  describe("authorizeVoter", function () {
    it("Should authorize a voter", async function () {
      const { electionId } = await createElectionWithCandidates();
      await expect(voting.authorizeVoter(electionId, voter1.address))
        .to.emit(voting, "VoterAuthorized")
        .withArgs(electionId, voter1.address);
      expect(await voting.isVoterAuthorized(electionId, voter1.address)).to.be.true;
    });

    it("Should authorize batch voters", async function () {
      const { electionId } = await createElectionWithCandidates();
      await voting.authorizeVotersBatch(electionId, [voter1.address, voter2.address, voter3.address]);
      expect(await voting.isVoterAuthorized(electionId, voter1.address)).to.be.true;
      expect(await voting.isVoterAuthorized(electionId, voter2.address)).to.be.true;
      expect(await voting.isVoterAuthorized(electionId, voter3.address)).to.be.true;
    });
  });

  // ─── 4. Cast Vote ─────────────────────────────────
  describe("castVote", function () {
    let electionId, startTime;

    beforeEach(async function () {
      const result = await createElectionWithCandidates();
      electionId = result.electionId;
      startTime = result.startTime;
      await voting.authorizeVoter(electionId, voter1.address);
      await voting.authorizeVoter(electionId, voter2.address);
      await time.increaseTo(startTime + 1);
    });

    it("Should allow authorized voter to cast vote", async function () {
      await expect(voting.connect(voter1).castVote(electionId, 1))
        .to.emit(voting, "VoteCast");
      expect(await voting.hasVoterVoted(electionId, voter1.address)).to.be.true;
    });

    it("Should reject double voting", async function () {
      await voting.connect(voter1).castVote(electionId, 1);
      await expect(
        voting.connect(voter1).castVote(electionId, 2)
      ).to.be.revertedWith("You have already voted");
    });

    it("Should reject unauthorized voter", async function () {
      await expect(
        voting.connect(unauthorized).castVote(electionId, 1)
      ).to.be.revertedWith("You are not authorized to vote in this election");
    });

    it("Should reject invalid candidate", async function () {
      await expect(
        voting.connect(voter1).castVote(electionId, 99)
      ).to.be.revertedWith("Invalid candidate");
    });

    it("Should tally vote count correctly", async function () {
      await voting.connect(voter1).castVote(electionId, 1);
      await voting.connect(voter2).castVote(electionId, 1);
      const [, , voteCounts] = await voting.getResults(electionId);
      expect(voteCounts[0]).to.equal(2n); // Alice got 2 votes
      expect(voteCounts[1]).to.equal(0n); // Bob got 0
    });

    it("Should provide verifiable vote receipt (hash)", async function () {
      await voting.connect(voter1).castVote(electionId, 1);
      const receipt = await voting.getVoteReceipt(electionId, voter1.address);
      expect(receipt).to.not.equal(ethers.ZeroHash);
    });
  });

  // ─── 5. Get Results & Status ───────────────────────
  describe("getResults & status", function () {
    it("Should return correct election status", async function () {
      const now = await time.latest();
      await voting.createElection("E1", "D", now + 100, now + 3600);
      expect(await voting.getElectionStatus(1)).to.equal("pending");
      await time.increaseTo(now + 101);
      expect(await voting.getElectionStatus(1)).to.equal("active");
      await time.increaseTo(now + 3601);
      expect(await voting.getElectionStatus(1)).to.equal("ended");
    });

    it("Should finalize election", async function () {
      const { electionId } = await createElectionWithCandidates();
      await voting.finalizeElection(electionId);
      expect(await voting.getElectionStatus(electionId)).to.equal("finalized");
    });
  });
});
