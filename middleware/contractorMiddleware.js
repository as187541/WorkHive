const Workspace = require('../models/workspaceModel');

/**
 * Middleware to restrict access for Contractor/Guest roles.
 * Blocks access to sensitive routes (admin, billing, other workspaces).
 * Only allows access to their assigned projects, tasks, and basic workspace info.
 */
const restrictContractorAccess = async (req, res, next) => {
  try {
    // If no user or user is SuperAdmin, allow access
    if (!req.user || req.user.role === 'SuperAdmin') {
      return next();
    }

    // Extract workspaceId from params or body
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.params.id;

    if (!workspaceId) {
      // If no workspace context, allow (e.g., general talent browsing)
      return next();
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }

    const memberRecord = workspace.members.find(m => m.user.equals(req.user._id));

    // If user is not a member, deny access
    if (!memberRecord) {
      return res.status(403).json({ msg: 'You are not a member of this workspace.' });
    }

    // If user is Admin, allow full access
    if (memberRecord.role === 'Admin') {
      return next();
    }

    // If user is Collaborator (existing role), allow access (existing behavior)
    if (memberRecord.role === 'Collaborator') {
      return next();
    }

    // If user is Contractor or Guest, restrict access
    if (memberRecord.role === 'Contractor' || memberRecord.role === 'Guest') {
      // Define allowed paths for contractors/guests
      const allowedPaths = [
        // Workspace basic info
        { method: 'GET', pattern: /^\/api\/v1\/workspaces\/[a-f\d]{24}$/ },
        // Project routes for their assigned project
        { method: 'GET', pattern: /^\/api\/v1\/workspaces\/[a-f\d]{24}\/projects/ },
        // Task routes
        { method: 'GET', pattern: /^\/api\/v1\/workspaces\/[a-f\d]{24}\/projects\/[a-f\d]{24}\/tasks/ },
        { method: 'POST', pattern: /^\/api\/v1\/workspaces\/[a-f\d]{24}\/projects\/[a-f\d]{24}\/tasks/ },
        { method: 'PATCH', pattern: /^\/api\/v1\/workspaces\/[a-f\d]{24}\/projects\/[a-f\d]{24}\/tasks\/[a-f\d]{24}$/ },
        // Comments
        { method: 'GET', pattern: /^\/api\/v1\/workspaces\/[a-f\d]{24}\/projects\/[a-f\d]{24}\/tasks\/[a-f\d]{24}\/comments/ },
        { method: 'POST', pattern: /^\/api\/v1\/workspaces\/[a-f\d]{24}\/projects\/[a-f\d]{24}\/tasks\/[a-f\d]{24}\/comments/ },
        // Talent profile viewing
        { method: 'GET', pattern: /^\/api\/v1\/talent/ },
        // Hire invitations (accept/reject)
        { method: 'GET', pattern: /^\/api\/v1\/hires\/received/ },
        { method: 'PATCH', pattern: /^\/api\/v1\/hires\/[a-f\d]{24}\/(accept|reject)$/ },
        // Auth routes
        { method: 'GET', pattern: /^\/api\/v1\/auth\/me/ },
        { method: 'PATCH', pattern: /^\/api\/v1\/auth\/update/ },
        // Ratings (view only)
        { method: 'GET', pattern: /^\/api\/v1\/ratings/ }
      ];

      const requestPath = req.originalUrl || req.path;
      const requestMethod = req.method;

      const isAllowed = allowedPaths.some(
        allowed => allowed.method === requestMethod && allowed.pattern.test(requestPath)
      );

      if (!isAllowed) {
        return res.status(403).json({
          msg: 'Access denied. Contractors and Guests have limited access to this resource.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('restrictContractorAccess error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * Middleware to block all admin routes for Contractors/Guests
 */
const blockContractorFromAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // SuperAdmin always allowed
    if (req.user.role === 'SuperAdmin') {
      return next();
    }

    // Check if user has any workspace membership as Contractor/Guest
    // This is a broad check for admin-level routes
    const userWorkspaces = await Workspace.find({ 'members.user': req.user._id });
    const hasContractorRole = userWorkspaces.some(ws =>
      ws.members.some(m => m.user.equals(req.user._id) && (m.role === 'Contractor' || m.role === 'Guest'))
    );

    // If the user ONLY has Contractor/Guest roles (no Admin/Collaborator), block admin routes
    const hasElevatedRole = userWorkspaces.some(ws =>
      ws.members.some(m => m.user.equals(req.user._id) && ['Admin', 'Collaborator'].includes(m.role))
    );

    if (hasContractorRole && !hasElevatedRole) {
      return res.status(403).json({ msg: 'Access denied. Contractors cannot access admin resources.' });
    }

    next();
  } catch (error) {
    console.error('blockContractorFromAdmin error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  restrictContractorAccess,
  blockContractorFromAdmin
};
