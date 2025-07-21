# File Transfer Application

A modern, full-stack file transfer app built with React, Node.js/Express, and Socket.io. Features secure authentication, real-time file transfer, and a professional, responsive UI.

## Features
- User registration & login with JWT authentication
- Real-time file transfer using Socket.io
- Progress indicators and status updates
- Responsive, glassmorphism UI
- Error handling and debugging scripts
- Supports files up to 50MB

## Getting Started

### Prerequisites
- Node.js & npm

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/iamavirals0101/file-transfer.git
   cd file-transfer
   ```
2. Install dependencies:
   ```
   npm install
   cd server && npm install
   ```

### Running the App
1. Start the backend server:
   ```
   npm run start --prefix server
   ```
2. Start the frontend dev server:
   ```
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

   <img width="532" height="635" alt="image" src="https://github.com/user-attachments/assets/3c07704c-eb06-4e9f-af6c-2ff281c6fc1d" />

   <img width="541" height="653" alt="image" src="https://github.com/user-attachments/assets/55c2c820-7677-40ea-82f6-9994afeafe30" />



## Usage
- Register two users in separate browser windows/tabs.
- Login as both users.
- Send files between users and watch real-time progress/status.

## Tech Stack
- React
- Vite
- Node.js
- Express
- Socket.io
- Multer
- JWT

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
MIT
