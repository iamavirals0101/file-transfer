# File Transfer Application

A modern, full-stack file transfer app built with React, Node.js/Express, and Socket.io. Features secure authentication, real-time file transfer, and a professional, responsive UI.

## Features
- User registration & login with JWT authentication
- Real-time file transfer using Socket.io
- Progress indicators and status updates
- Responsive, glassmorphism UI
- Error handling and debugging scripts
- Supports files up to 50MB
- User list with online status
- Transfer history and analytics (charts)
- File type previews (icons)
- Toast notifications for actions and errors
- Drag-and-drop file upload
- Dark/light theme toggle
- Profile avatars
- Mobile optimization
- Accessibility controls (font size)
- Customizable layouts (compact/grid)
- Contextual menus for users
- Internationalization (English/Hindi)
- Branding elements (logo, welcome screens)
- Animated modals, skeleton loaders, floating action button

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

## Usage
- Register two users in separate browser windows/tabs.
- Login as both users.
- Send files between users and watch real-time progress/status, history, and analytics.

## Tech Stack
- React
- Vite
- Node.js
- Express
- Socket.io
- Multer
- JWT
- Chart.js

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
MIT
