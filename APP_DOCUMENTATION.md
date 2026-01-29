# PayPal Integration Demo App Documentation

## Overview

This application demonstrates a simple PayPal payment integration using Node.js and Express. It provides a backend server to handle PayPal API interactions, including creating orders and capturing payments. It is designed to work with the PayPal Sandbox environment for testing.

## Technologies Used

- **Runtime**: Node.js
- **Framework**: Express.js
- **Dependencies**:
  - `node-fetch`: For making HTTP requests to PayPal's API.
  - `dotenv`: For managing environment variables.

## Prerequisites

Before running this application, ensure you have the following:

1. **Node.js**: Installed on your machine.
2. **PayPal Developer Account**: You need a [PayPal Developer accounts](https://developer.paypal.com/) or (https://developer.paypal.com/dashboard/applications/live)to get your API credentials.

## Setup Instructions

### 1. Clone/Download the Repository

Ensure you have the project files in your local directory.

### 2. Install Dependencies

Navigate to the project directory and run:

```bash
npm install
```

### 3. Configure Environment Variables

1. Create a `.env` file in the root directory (you can copy `.env.example`).
2. Add your PayPal Sandbox credentials:
   ```env
   PAYPAL_CLIENT_ID=your_sandbox_client_id
   PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
   PORT=3000
   # For Sandbox (default):
   PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
   # For Live:
   # PAYPAL_API_BASE=https://api-m.paypal.com
   ```
   _Note: Never commit your real `.env` file to version control._

### 4. Run the Server

Start the application with:

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

The server will start at `http://localhost:3000`.

## API Endpoints

### 1. Create Order

- **Endpoint**: `POST /api/orders`
- **Description**: Creates a new payment order with PayPal.
- **Request Body**:
  ```json
  {
    "cart": [ ... ] // Cart details from frontend
  }
  ```
- **Response**: Returns the JSON response from PayPal including the Order ID.

### 2. Capture Order

- **Endpoint**: `POST /api/orders/:orderID/capture`
- **Description**: Captures the funds for a specific authorized order.
- **Params**: `orderID` (The ID of the order to capture).
- **Response**: Returns the JSON response from PayPal confirming the capture.

## Frontend Integration

The frontend is built with vanilla JavaScript and located in the `public/` directory.

- **`public/index.html`**: Loads the PayPal JS SDK script. **Important**: You need to update the `client-id` in the script tag in this file if you are not passing it dynamically (though this example handles logic mostly on the backend, the SDK load usually requires the client ID).
- **`public/app.js`**: Initializes the PayPal buttons using `window.paypal.Buttons`.
  - `createOrder`: Calls the backend `POST /api/orders` endpoint.
  - `onApprove`: Calls the backend `POST /api/orders/:orderID/capture` endpoint after the user approves the payment on the PayPal popup.

## Project Structure

- **server.js**: Main entry point. Handles API routes and PayPal logic (`generateAccessToken`, `createOrder`, `captureOrder`).
- **public/**: Directory for static frontend assets (HTML, CSS, Client-side JS).
- **package.json**: Manages dependencies and scripts.
