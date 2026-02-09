# Team Member Mapping - Quick Start Guide

## What is Team Member Mapping?

Team Member Mapping allows you to assign specific clients to individual team members in recurring tasks. Each team member will only see the clients assigned to them, providing better privacy and organization.

## How to Use

### Step 1: Create a Recurring Task

1. Navigate to **Tasks > Recurring Tasks** (`/tasks/recurring`)
2. Click **"Create New Recurring Task"** button
3. Fill in the basic task details:
   - Task Title (e.g., "Monthly Financial Review")
   - Description
   - Recurrence Pattern (Monthly, Quarterly, etc.)
   - Start Date and End Date

### Step 2: Configure Team Member Mapping

1. Scroll down to find the **"Team Member Mapping"** section (below the Team field)
2. Click the **"Configure Team Member Mapping"** button
3. A dialog will open with two columns:
   - **Left Column**: Select Team Member
   - **Right Column**: Select Clients

### Step 3: Assign Clients to Team Members

**Example Scenario**: Assign clients to three team members

#### For Ajay (5 clients):
1. Select **"Ajay"** from the Team Member dropdown
2. Select clients from the Clients dropdown:
   - Click "Client A" → Added
   - Click "Client B" → Added
   - Click "Client C" → Added
   - Click "Client D" → Added
   - Click "Client E" → Added
3. You'll see "Ajay: 5 clients" in the mappings list

#### For Balram (10 clients):
1. Select **"Balram"** from the Team Member dropdown
2. Select 10 clients from the Clients dropdown
3. You'll see "Balram: 10 clients" in the mappings list

#### For Himanshu (2 clients):
1. Select **"Himanshu"** from the Team Member dropdown
2. Select 2 clients from the Clients dropdown
3. You'll see "Himanshu: 2 clients" in the mappings list

### Step 4: Save and Create Task

1. Click **"Save Mappings"** in the dialog
2. You'll see a summary: "3 Team Members Mapped"
3. Complete any remaining fields (Priority, ARN settings, etc.)
4. Click **"Create Recurring Task"**

## What Happens Next?

### For Employees (e.g., Balram)

When Balram logs into the dashboard:

1. **Dashboard View** (`/dashboard`):
   - Shows only tasks where Balram is assigned
   - Client count button shows **"10 Clients"** (only Balram's clients)
   - Assignment badge shows **"Balram"** in purple (individual assignment)

2. **Clicking Client Count**:
   - Opens modal showing only Balram's 10 assigned clients
   - Ajay's 5 clients are NOT visible
   - Himanshu's 2 clients are NOT visible

3. **Task Details**:
   - Task title and description visible
   - Only Balram's assigned clients are accessible
   - Cannot see other team members' client assignments

### For Admin/Manager

Admins and managers see:
- **All recurring tasks** (regardless of mappings)
- **All clients** for each task
- **Full mapping details** for all team members
- Can edit and manage all mappings

## Visual Indicators

### Dashboard Badges

- **Blue Badge** (with users icon): Shows client count
  - Example: "10 Clients"
  
- **Green Badge** (with team icon): Shows team name (when team is assigned)
  - Example: "Financial Team"
  
- **Purple Badge** (with user icon): Shows individual assignment (when using mappings without team)
  - Example: "Balram"

## Editing Existing Mappings

1. Open the recurring task for editing
2. Click **"Configure Team Member Mapping"** button
3. The dialog shows current mappings
4. **To add more clients**: Select user, then select additional clients
5. **To remove a client**: Click the X icon next to the client name
6. **To remove a user**: Click the X icon next to the user name
7. Click **"Save Mappings"** and then **"Update Recurring Task"**

## Tips and Best Practices

### ✅ Do's

- **Assign clients based on expertise**: Match clients to team members with relevant skills
- **Balance workload**: Try to distribute clients evenly among team members
- **Review regularly**: Update mappings as team capacity changes
- **Use clear naming**: Ensure team member names are easily identifiable

### ❌ Don'ts

- **Don't overlap unnecessarily**: Avoid assigning the same client to multiple team members unless needed
- **Don't forget to save**: Always click "Save Mappings" before closing the dialog
- **Don't mix with team assignments**: If using team member mappings, you typically don't need to also assign a team

## Troubleshooting

### "I don't see any clients in the dashboard"

**Possible causes**:
1. No clients have been assigned to you in the team member mapping
2. The recurring task hasn't been created yet
3. You're not logged in with the correct account

**Solution**: Contact your admin to verify your client assignments

### "I see all clients instead of just mine"

**Possible causes**:
1. You have admin or manager role (admins see all clients)
2. Team member mapping wasn't configured for this task

**Solution**: This is expected behavior for admins/managers

### "The mapping dialog is empty"

**Possible causes**:
1. No users exist in the system
2. No clients exist in the system

**Solution**: Ensure users and clients are created before setting up mappings

## Example Use Cases

### Use Case 1: Regional Assignment
- **North Region**: Assign 15 clients to "John"
- **South Region**: Assign 12 clients to "Sarah"
- **East Region**: Assign 18 clients to "Mike"

### Use Case 2: Service Type Assignment
- **Tax Services**: Assign 20 clients to "Tax Team Lead"
- **Audit Services**: Assign 15 clients to "Audit Team Lead"
- **Consulting**: Assign 10 clients to "Consulting Lead"

### Use Case 3: Workload Distribution
- **Senior Consultant**: Assign 25 complex clients
- **Junior Consultant 1**: Assign 15 standard clients
- **Junior Consultant 2**: Assign 15 standard clients

## Need Help?

If you encounter any issues or have questions:
1. Check this guide first
2. Review the full implementation document: `TEAM_MEMBER_MAPPING_IMPLEMENTATION.md`
3. Contact your system administrator
4. Check the browser console for error messages (F12 → Console tab)
