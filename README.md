# Healthcare Emergency Connect

Healthcare Emergency Connect is a full-stack ambulance dispatch and emergency healthcare platform built for hackathons. The project focuses on making ambulance booking, driver assignment, live tracking, and hospital coordination faster and easier to manage.

The application connects patients and ambulance drivers through a central backend and provides real-time updates during the emergency request process.

## Features

* Patient registration and login
* Driver login and dashboard
* Ambulance booking
* Emergency priority handling
* Real-time driver requests
* Driver request acceptance
* Ambulance status updates
* Live simulated ambulance tracking
* Hospital availability
* JWT authentication
* Password hashing with bcrypt
* REST APIs
* Socket.IO real-time communication
* Responsive glassmorphism UI

## How It Works

The basic emergency workflow is:

```text
┌─────────────┐
│   Patient   │
└──────┬──────┘
       │
       │ Request Ambulance
       ▼
┌──────────────────┐
│     Backend      │
│ Node.js/Express  │
└────────┬─────────┘
         │
         │ Send Request
         ▼
┌──────────────────┐
│      Driver      │
└────────┬─────────┘
         │
         │ Accept Request
         ▼
┌──────────────────┐
│  Live Tracking   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Hospital     │
└──────────────────┘
```

Once a patient creates an emergency request, the backend processes it and makes it available to drivers. A driver can accept the request, after which the patient receives status updates and can follow the simulated ambulance movement.

## Patient Flow

```text
┌──────────────────┐
│   Patient Login  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Patient Dashboard│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Request Ambulance │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Emergency Details│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Request Submitted │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Driver Assigned   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Live Tracking     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Hospital      │
└──────────────────┘
```

## Driver Flow

```text
┌──────────────────┐
│    Driver Login  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Driver Dashboard │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Available Requests│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ View Emergency   │
│     Details      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Accept Request  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Travel to Patient│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Update Status    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Complete Request │
└──────────────────┘
```

## System Architecture

The frontend communicates with the backend through REST APIs. Socket.IO is used for events that need to be delivered in real time.

```text
                 ┌──────────────────┐
                 │  React Frontend  │
                 └────────┬─────────┘
                          │
                          │ REST API
                          ▼
                 ┌──────────────────┐
                 │ Express Backend  │
                 │    Node.js       │
                 └────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
      ┌────────────┐ ┌──────────┐ ┌────────────┐
      │   Auth     │ │ Ambulance│ │  Hospital  │
      │   System   │ │ Requests │ │   Data     │
      └────────────┘ └──────────┘ └────────────┘
                          │
                          │ Socket.IO
                          ▼
                 ┌──────────────────┐
                 │ Real-Time Events │
                 └──────────────────┘
```

## Authentication Flow

The application uses JWT-based authentication.

```text
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ Login
       ▼
┌──────────────────┐
│ React Frontend   │
└────────┬─────────┘
         │
         │ POST /login
         ▼
┌──────────────────┐
│ Express Backend  │
└────────┬─────────┘
         │
         │ Verify Credentials
         ▼
┌──────────────────┐
│  Generate JWT    │
└────────┬─────────┘
         │
         │ Token
         ▼
┌──────────────────┐
│ Protected APIs   │
└──────────────────┘
```

Passwords are hashed using bcrypt instead of being stored as plain text.

## Real-Time Communication

Socket.IO is used for communication that needs to happen without continuously refreshing the page.

For example, when a patient creates an ambulance request, the backend can notify available drivers. When a driver accepts the request, the patient can immediately receive the updated status.

```text
┌─────────────┐
│   Patient   │
└──────┬──────┘
       │
       │ Create Request
       ▼
┌──────────────────┐
│     Backend      │
└────────┬─────────┘
         │
         │ Socket.IO Event
         ▼
┌──────────────────┐
│      Driver      │
└────────┬─────────┘
         │
         │ Accept Request
         ▼
┌──────────────────┐
│     Backend      │
└────────┬─────────┘
         │
         │ Status Update
         ▼
┌──────────────────┐
│     Patient      │
│    Dashboard     │
└──────────────────┘
```

## Emergency Priority

Emergency requests can have different priority levels.

```text
┌──────────────────┐
│ Critical         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ High             │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Medium           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Normal           │
└──────────────────┘
```

This provides a foundation for a more advanced dispatch system where emergency severity, ambulance distance, driver availability, and hospital capacity could be considered together.

## Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* HTML
* CSS

### Backend

* Node.js
* Express.js
* REST APIs
* JWT
* bcrypt
* Socket.IO

### Other

* Git
* GitHub
* Simulated location tracking
* Responsive UI

## API Communication

The frontend and backend communicate using REST APIs.

GET requests are used to retrieve data, POST requests are used to create new data, and PATCH or PUT requests are used to update existing data.

The backend handles operations such as:

* User registration
* User login
* Ambulance requests
* Driver information
* Driver availability
* Hospital information
* Request status updates

The exact routes can be found inside the server-side route files.

## Project Structure

```text
health-connect-emergency-app
│
├── client
│   ├── src
│   ├── public
│   └── package.json
│
├── server
│   ├── routes
│   ├── controllers
│   ├── middleware
│   └── package.json
│
├── scripts
│
├── DEPLOYMENT.md
├── HACKATHON_WORKFLOW.md
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

Make sure Node.js and npm are installed.

```bash
node --version
npm --version
```

### Clone the Repository

```bash
git clone https://github.com/Shreyansh-12505/health-connect-emergency-app.git
cd health-connect-emergency-app
```

### Install Dependencies

```bash
npm run install:all
```

### Start the Application

```bash
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

The backend runs on:

```text
http://localhost:8080
```

## Demo Accounts

### Patient

```text
Email: patient@test.com
Password: 123456
```

### Driver

```text
Email: driver@test.com
Password: 123456
```

These accounts can be used to test the patient and driver workflows locally.

## Example Workflow

```text
┌─────────────────────┐
│ Patient Logs In     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Creates Emergency   │
│ Ambulance Request   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Backend Processes   │
│ The Request         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Driver Receives     │
│ Real-Time Request   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Driver Accepts      │
│ The Request         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Patient Sees Driver │
│ & Tracking Status   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Ambulance Reaches   │
│ Patient             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Hospital / Request  │
│ Completion          │
└─────────────────────┘
```

## Future Improvements

Some features that can be added in future versions include:

* Real GPS-based ambulance tracking
* Google Maps or another mapping service
* Accurate ETA calculation
* Traffic-aware routing
* Real hospital bed and ICU availability
* Push notifications
* Emergency SOS
* Driver navigation
* In-app calling
* AI-assisted emergency prioritization
* Dedicated mobile application
* More advanced role-based authorization
* Production-level security and monitoring

## Important Note

Healthcare Emergency Connect is a hackathon prototype created to demonstrate an emergency ambulance coordination workflow.

The ambulance tracking in the current version is simulated, and the hospital information is intended for demonstration purposes. The application should not be used as a replacement for real emergency medical services.

## Repository

GitHub: https://github.com/Shreyansh-12505/health-connect-emergency-app

## Vision

The idea behind Healthcare Emergency Connect is simple: reduce the communication gap between patients, ambulance drivers, and hospitals and make emergency transportation easier to coordinate.
