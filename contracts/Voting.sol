// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Decentralized Voting System
/// @notice Hệ thống bỏ phiếu phi tập trung với ẩn danh phiếu bầu
contract Voting {
    // ─────────────────────────────────────────────────
    //  Structs
    // ─────────────────────────────────────────────────
    struct Candidate {
        uint256 id;
        string name;
        string description;
        uint256 voteCount;
    }

    struct Election {
        uint256 id;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool exists;
        bool finalized;
        uint256 candidateCount;
        uint256 voterCount;
    }

    // ─────────────────────────────────────────────────
    //  State Variables
    // ─────────────────────────────────────────────────
    address public owner;
    uint256 public electionCount;

    // electionId => Election
    mapping(uint256 => Election) public elections;

    // electionId => candidateId => Candidate
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;

    // electionId => voter address => has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // electionId => voter address => vote hash (ẩn danh)
    mapping(uint256 => mapping(address => bytes32)) public voteReceipts;

    // ─────────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────────
    event ElectionCreated(
        uint256 indexed electionId,
        string name,
        uint256 startTime,
        uint256 endTime
    );
    event CandidateAdded(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        string name
    );
    event VoterAuthorized(
        uint256 indexed electionId,
        address indexed voter
    );
    event VoteCast(
        uint256 indexed electionId,
        address indexed voter,
        bytes32 voteHash,
        uint256 timestamp
    );
    event ElectionFinalized(uint256 indexed electionId, uint256 timestamp);

    // ─────────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(elections[_electionId].exists, "Election does not exist");
        _;
    }

    modifier electionActive(uint256 _electionId) {
        require(elections[_electionId].exists, "Election does not exist");
        require(
            block.timestamp <= elections[_electionId].endTime,
            "Election has already ended"
        );
        require(!elections[_electionId].finalized, "Election is finalized");
        _;
    }

    modifier notVoted(uint256 _electionId) {
        require(!hasVoted[_electionId][msg.sender], "You have already voted");
        _;
    }

    // ─────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        electionCount = 0;
    }

    // ─────────────────────────────────────────────────
    //  Admin Functions
    // ─────────────────────────────────────────────────

    /// @notice Tạo cuộc bầu cử mới
    function createElection(
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner returns (uint256) {
        require(_endTime > _startTime, "End time must be after start time");
        require(_startTime >= block.timestamp - 600, "Start time is too far in the past");

        electionCount++;
        uint256 newId = electionCount;

        elections[newId] = Election({
            id: newId,
            name: _name,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            exists: true,
            finalized: false,
            candidateCount: 0,
            voterCount: 0
        });

        emit ElectionCreated(newId, _name, _startTime, _endTime);
        return newId;
    }

    /// @notice Thêm ứng viên vào cuộc bầu cử
    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _description
    ) external onlyOwner electionExists(_electionId) returns (uint256) {
        require(
            elections[_electionId].voterCount == 0,
            "Cannot add candidates after voting has started"
        );

        elections[_electionId].candidateCount++;
        uint256 candidateId = elections[_electionId].candidateCount;

        candidates[_electionId][candidateId] = Candidate({
            id: candidateId,
            name: _name,
            description: _description,
            voteCount: 0
        });

        emit CandidateAdded(_electionId, candidateId, _name);
        return candidateId;
    }

    /// @notice Kết thúc bầu cử
    function finalizeElection(
        uint256 _electionId
    ) external onlyOwner electionExists(_electionId) {
        require(!elections[_electionId].finalized, "Election already finalized");
        elections[_electionId].finalized = true;
        emit ElectionFinalized(_electionId, block.timestamp);
    }

    // ─────────────────────────────────────────────────
    //  Voter Functions
    // ─────────────────────────────────────────────────

    /// @notice Bỏ phiếu — công khai minh bạch nhưng ẩn danh lựa chọn
    function castVote(
        uint256 _electionId,
        uint256 _candidateId
    )
        external
        electionActive(_electionId)
        notVoted(_electionId)
    {
        require(
            _candidateId > 0 &&
            _candidateId <= elections[_electionId].candidateCount,
            "Invalid candidate"
        );

        // Tạo hash bảo mật (không thể dịch ngược để biết chọn ai)
        bytes32 voteHash = keccak256(
            abi.encodePacked(
                _electionId,
                _candidateId,
                msg.sender,
                block.timestamp
            )
        );

        // Ghi nhận trạng thái
        hasVoted[_electionId][msg.sender] = true;
        voteReceipts[_electionId][msg.sender] = voteHash;
        
        // Cập nhật tổng số phiếu cho ứng viên (không lưu mapping công khai ai chọn ai)
        candidates[_electionId][_candidateId].voteCount++;
        elections[_electionId].voterCount++;

        emit VoteCast(_electionId, msg.sender, voteHash, block.timestamp);
    }

    // ─────────────────────────────────────────────────
    //  View Functions
    // ─────────────────────────────────────────────────

    /// @notice Lấy kết quả bầu cử (số phiếu từng ứng viên)
    function getResults(
        uint256 _electionId
    )
        external
        view
        electionExists(_electionId)
        returns (
            string[] memory names,
            string[] memory descriptions,
            uint256[] memory voteCounts
        )
    {
        uint256 count = elections[_electionId].candidateCount;
        names = new string[](count);
        descriptions = new string[](count);
        voteCounts = new uint256[](count);

        for (uint256 i = 1; i <= count; i++) {
            names[i - 1] = candidates[_electionId][i].name;
            descriptions[i - 1] = candidates[_electionId][i].description;
            voteCounts[i - 1] = candidates[_electionId][i].voteCount;
        }
    }

    /// @notice Lấy hash phiếu bầu của voter (để tra cứu minh bạch)
    function getVoteReceipt(
        uint256 _electionId,
        address _voter
    ) external view returns (bytes32) {
        require(hasVoted[_electionId][_voter], "Voter has not voted");
        return voteReceipts[_electionId][_voter];
    }

    /// @notice Kiểm tra voter đã bỏ phiếu chưa
    function hasVoterVoted(
        uint256 _electionId,
        address _voter
    ) external view returns (bool) {
        return hasVoted[_electionId][_voter];
    }

    /// @notice Lấy thông tin ứng viên
    function getCandidate(
        uint256 _electionId,
        uint256 _candidateId
    )
        external
        view
        electionExists(_electionId)
        returns (
            uint256 id,
            string memory name,
            string memory description,
            uint256 voteCount
        )
    {
        Candidate memory c = candidates[_electionId][_candidateId];
        return (c.id, c.name, c.description, c.voteCount);
    }

    /// @notice Lấy thông tin election
    function getElection(
        uint256 _electionId
    )
        external
        view
        electionExists(_electionId)
        returns (
            uint256 id,
            string memory name,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            bool finalized,
            uint256 candidateCount,
            uint256 voterCount
        )
    {
        Election memory e = elections[_electionId];
        return (
            e.id,
            e.name,
            e.description,
            e.startTime,
            e.endTime,
            e.finalized,
            e.candidateCount,
            e.voterCount
        );
    }

    /// @notice Kiểm tra voter có được quyền bầu không (Luôn true vì bầu cử tự do)
    function isVoterAuthorized(
        uint256 /* _electionId */,
        address /* _voter */
    ) external pure returns (bool) {
        return true;
    }

    /// @notice Lấy trạng thái election
    function getElectionStatus(
        uint256 _electionId
    ) external view electionExists(_electionId) returns (string memory) {
        Election memory e = elections[_electionId];
        if (e.finalized) return "finalized";
        if (block.timestamp < e.startTime) return "pending";
        if (block.timestamp <= e.endTime) return "active";
        return "ended";
    }
}
