# VoteChain - Decentralized Voting System

## Tổng Quan
VoteChain là một ứng dụng bầu cử phi tập trung tích hợp Blockchain Sepolia, Node.js và React.

## Khởi Chạy Nhanh
1. **Database**: Đảm bảo file `backend/voting_blockchain.sqlite` tồn tại.
2. **Backend**: 
   - `cd backend`
   - `npm install`
   - `npm run dev`
3. **Frontend**:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Công Nghệ
- Solidity (Smart Contract)
- Ethers.js
- React (Vite)
- Express.js
- SQLite

# Project Structure — Decentralized Voting System

Tài liệu chi tiết cấu trúc thư mục và vai trò của các file trong dự án.

##  Thư mục gốc
- `package.json`: Cấu hình workspace và các lệnh chạy chung.
- `hardhat.config.js`: Cấu hình mạng Blockchain (Hardhat, Ganache, Sepolia).
- `run_project.bat`: Script khởi động nhanh toàn bộ hệ thống.
- `contracts/Voting.sol`: Smart Contract xử lý logic bầu cử on-chain.
- `scripts/deploy.js`: Script triển khai contract và đồng bộ ABI sang frontend/backend.
- `test/Voting.test.js`: Unit tests cho Smart Contract.

##  backend/
- `src/server.js`: Entry point, khởi động server.
- `src/app.js`: Cấu hình Express và các routes.
- `src/config/db.js`: Kết nối SQLite.
- `src/config/initDb.js`: Khởi tạo bảng dữ liệu và admin mặc định.
- `src/controllers/`: Xử lý logic nghiệp vụ (Auth, Election, Vote, User, Blockchain).
- `src/middlewares/`: Phân quyền, xác thực JWT và xử lý lỗi.
- `src/routes/`: Định nghĩa các API endpoints.

##  frontend/
- `src/main.jsx`: Entry point của ứng dụng React.
- `src/App.jsx`: Cấu hình Router và các Providers (Auth, Web3).
- `src/index.css`: Design system với giao diện Dark Mode cao cấp.
- `src/api/`: Lớp giao tiếp với Backend API bằng Axios.
- `src/context/`:
    - `AuthContext.jsx`: Quản lý trạng thái đăng nhập và vai trò người dùng.
    - `Web3Context.jsx`: Quản lý kết nối MetaMask và tương tác Smart Contract.
- `src/components/`: Các thành phần UI dùng chung (Sidebar, Layout, ProtectedRoute).
- `src/pages/`:
    - `AuthPages.jsx`: Trang Đăng nhập / Đăng ký.
    - `AdminDashboard.jsx`: Dashboard thống kê dành cho admin.
    - `ManageElections.jsx`: Quản lý bầu cử (Tạo, Thêm ứng viên).
    - `ManageVoters.jsx`: Phê duyệt địa chỉ ví cử tri.
    - `ElectionListPage.jsx`: Danh sách bầu cử dành cho cử tri.
    - `VotePage.jsx`: Giao diện bỏ phiếu (tương tác MetaMask).
    - `ResultPage.jsx`: Kết quả bầu cử thời gian thực với biểu đồ.
    - `BlockchainExplorer.jsx`: Tra cứu giao dịch trên mạng Blockchain.

