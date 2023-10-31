<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# NestJS Chat & Game API Server

A powerful NestJS-based API server that serves as the backend for a chat application and a Pong game server. This server provides a variety of features including authentication, user management, friend lists, blocked friends, and various types of chat rooms.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [WebSocket](#websocket)
- [Contributing](#contributing)

## Features

- User authentication using JWT (JSON Web Tokens).
- User registration and management.
- Friend lists with the ability to block friends.
- Real-time chat with private, public, and protected chat rooms.
- Pong game server with WebSocket support.
- Cron jobs for periodic tasks.

## Prerequisites

Before you begin, ensure you have the following requirements installed:

- Nest.js and npm.
- PostgreSQL or another supported database.

## Getting Started

1. Clone this repository:

   ```bash
   git clone git@github.com:DayneeBoiiz/NestJS-Chat-Game-API-Server.git

   cd NestJS-Chat-Game-API-Server

   npm install
   ```

## Configuration

Create a .env file in the project root directory and configure your environment variables as follows:

  ```env
    DATABASE_URL=your_database_connection_url
    JWT_SECRET=your_jwt_secret
    INTRA_CLIENT_ID=your_intra_client_id
    INTRA_CLIENT_SECRET=your_intra_client_secret
    INTRA_CALLBACK_URL=your_intra_callback_url
  ```

## Authentication

User authentication is handled using JWT (JSON Web Tokens). To authenticate, include the token in the Authorization header of your requests:

  ```http
  Authorization: Bearer your_jwt_token
  ```

## API Endpoints

The server provides the following API endpoints:

  - `/auth`: Authentication and registration endpoints.
  - `/users`: : User management including friend lists and blocked friends.
  - `/chat`: Chat room management.
  - `/game`: Pong game server endpoints.

Refer to the source code for detailed request and response formats.

## WebSocket

Real-time features, including chat and the Pong game, are implemented using WebSocket. WebSocket connections are established at /ws. Ensure your client application supports WebSocket connections.

## Contributing

Contributions are welcome! If you'd like to contribute to this project, please follow these steps:

  1. Fork the repository.
  2. Create a new branch for your feature or bug fix:
      ```bash
      git checkout -b feature/your-feature-name
      ```
  3. Commit your changes and push them to your fork:
      ```bash
      git commit -m 'Add some feature'
      git push origin feature/your-feature-name
      ```
  4. Create a pull request on the original repository.
