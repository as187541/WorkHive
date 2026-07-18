# WorkHive System Diagrams

This folder contains comprehensive system architecture diagrams for the WorkHive SaaS application, created in draw.io (diagrams.net) format.

## 📋 Diagram Index

### 1. **System Architecture** (`01-system-architecture.drawio`)
**Overview of the entire system architecture**
- Frontend layer (React + Vite)
- Backend layer (Node.js + Express)
- Database layer (MongoDB)
- External services integration
- Data flow between components

**Key Components:**
- 35+ frontend pages and components
- 21 backend controllers
- 18 API route groups
- 21 database models
- 6 external services

---

### 2. **Backend API Routes** (`02-backend-api-routes.drawio`)
**Detailed API endpoint documentation**
- Authentication module (5 endpoints)
- Workspace module (6 endpoints)
- Project module (6 endpoints)
- Task module (6 endpoints)
- Messaging module (5 endpoints)
- Job marketplace (6 endpoints)
- Hire & talent (6 endpoints)
- Order & escrow (6 endpoints)
- Additional modules (ratings, connections, activities, analytics, automations, redemptions, services, admin)
- Middleware flow diagram

**Each endpoint shows:**
- HTTP method and path
- Controller function
- Business logic flow
- Response details

---

### 3. **Data Model ERD** (`03-data-model-erd.drawio`)
**Entity Relationship Diagram for all 21 models**

**Core Entities:**
- User (authentication, wallet, talent profile)
- Workspace (members, roles)
- Project (lead, contractors)
- Task (assignments, rewards)

**Marketplace Entities:**
- JobPosting
- Proposal (with milestones, counter-offers)
- Order (escrow, milestones)
- ServicePackage
- HireInvitation

**Communication Entities:**
- Conversation
- Message

**Additional Entities:**
- Rating, Connection, Activity
- AutomationRule, Reward, RedemptionRequest
- Comment, Invitation, SavedSearch
- AuditLog

**Relationships shown:**
- One-to-Many (1:N)
- One-to-One (1:1)
- Foreign key references
- Embedded documents

---

### 4. **Authentication Flow** (`04-authentication-flow.drawio`)
**Complete authentication and authorization flows**

**Flows Documented:**
1. Registration Flow (5 steps)
2. OTP Verification Flow (6 steps)
3. Login Flow (6 steps)
4. JWT Authentication Middleware (7 steps)
5. Role-Based Authorization
6. Socket.IO Authentication
7. Security Features

**Security Features:**
- Password hashing (bcryptjs)
- JWT tokens (7-day expiration)
- OTP verification (10-minute expiry)
- CORS protection
- Input validation
- Audit logging
- Contractor isolation

---

### 5. **Real-time Messaging** (`05-realtime-messaging.drawio`)
**WebSocket and real-time communication architecture**

**Components:**
- Socket.IO server setup
- Socket.IO client configuration
- Room management (personal, conversation, workspace, project)
- Message sending flow (7 steps)
- Typing indicators (9 steps)
- Notification system
- Real-time task updates
- Connection lifecycle

**Real-time Events:**
- new_message
- user_typing / user_stop_typing
- notification
- task_updated
- join/leave rooms

---

### 6. **Frontend Components** (`06-frontend-components.drawio`)
**React component architecture and hierarchy**

**Structure:**
- App.jsx (root component)
- MainLayout (navbar + sidebar + content)
- SocketContext (global WebSocket state)
- 20+ page components
- 25+ reusable components
- Admin pages (7 pages)
- Custom hooks and utilities

**Component Categories:**
- Modals (13 types)
- Cards (5 types)
- Specialized components (16 types)
- Admin guards and routes

---

### 7. **Deployment Infrastructure** (`07-deployment-infrastructure.drawio`)
**Production deployment and infrastructure setup**

**Diagrams:**
- Production architecture (Cloudflare → Netlify → Backend → MongoDB)
- External services integration
- Local development setup
- Deployment process (backend, frontend, database)
- CI/CD pipeline (GitHub Actions)
- Monitoring and maintenance

**Platforms:**
- Frontend: Netlify
- Backend: Railway / Render / Heroku
- Database: MongoDB Atlas
- CDN: Cloudflare
- File Storage: Cloudinary
- Email: Nodemailer (Gmail SMTP)

---

## 🛠️ How to Use These Diagrams

### Opening the Diagrams

1. **Online (Recommended):**
   - Go to [app.diagrams.net](https://app.diagrams.net)
   - Click "Open Existing Diagram"
   - Select any `.drawio` file from this folder
   - Navigate between pages using the tabs at the bottom

2. **Desktop App:**
   - Download draw.io desktop from [get.diagrams.net](https://get.diagrams.net)
   - Open any `.drawio` file
   - All pages will be available in tabs

3. **VS Code Extension:**
   - Install "Draw.io Integration" extension
   - Click on any `.drawio` file to preview
   - Edit directly in VS Code

### Navigating Between Diagrams

Each diagram file contains multiple pages/tabs. To switch between pages:
- Look for tabs at the bottom of the draw.io window
- Click on page names to switch views
- Use keyboard shortcuts: `Ctrl+Tab` (next), `Ctrl+Shift+Tab` (previous)

### Exporting Diagrams

To export diagrams as images or PDFs:

1. **In draw.io:**
   - File → Export as → PNG / JPEG / SVG / PDF
   - Choose "All pages" to export all diagrams
   - Adjust zoom and padding as needed

2. **Command Line (for automation):**
   ```bash
   # Install draw.io CLI
   npm install -g @drawio/drawio-cli
   
   # Export all diagrams to PNG
   drawio export --format png *.drawio
   
   # Export specific page
   drawio export --format png --page-index 0 01-system-architecture.drawio
   ```

---

## 📊 Diagram Statistics

- **Total Diagrams:** 7 files
- **Total Pages:** 7+ pages (one per file)
- **Total Components Documented:** 100+
- **Total API Endpoints:** 80+
- **Total Database Models:** 21
- **Total External Services:** 6

---

## 🔄 Updating Diagrams

When the codebase changes, update the diagrams:

1. Open the relevant `.drawio` file
2. Make changes to reflect new architecture
3. Save the file
4. Commit to Git with descriptive message

**Best Practices:**
- Keep diagrams in sync with code
- Use consistent color coding
- Maintain clear labels
- Document all relationships
- Include examples where helpful

---

## 🎨 Color Coding

- **Blue (#0066CC):** Frontend components
- **Green (#009900):** Backend services
- **Red (#CC0000):** Database/Admin
- **Orange (#FF6600):** Authentication/Orders
- **Purple (#9933CC):** Messaging/Notifications
- **Yellow (#CC9900):** Tasks/Projects
- **Gray (#666666):** Utilities/Additional

---

## 📝 Notes

- All diagrams are interactive - hover over elements for details
- Arrows indicate data flow and relationships
- Dotted lines represent optional/conditional flows
- All text is searchable in draw.io
- Diagrams are version-controlled with Git

---

## 🔗 Additional Resources

- [WorkHive Documentation](../PROJECT_DOCUMENTATION.md)
- [API Documentation](../routes/)
- [Database Models](../models/)
- [Frontend Components](../my-saas-frontend/src/)

---

**Last Updated:** May 2026
**Maintained By:** Development Team
