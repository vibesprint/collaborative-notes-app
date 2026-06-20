# Capstone Project
Final project to mark the completion of this learning path.

Database schema for workspace and memberships :-
workspaces:
  name: text
  created_by: fk to users

workspace_members:
  workspace_id: fk to workspaces
  user_id: fk to users
  role_type: member_type enum type values (OWNER, MEMBER)

Requirements for workspaces and memberships :-
Every user will start with a workspace named Default, of which they are the owner.
Only an owner can delete a workspace. Members deleting the workspace would
remove them from the membership.

Creating a workspace :-
  Create a workspace of that name in workspaces table.
  Create a record with that workspace in members table.

Delete a workspace :-
  Check if the user is the owner of the said workspace.
  If so:
      Delete the workspace from the workspaces table. All the memberships
      in the members table should be deleted by cascade.
  else:
      Check if user is the member of the workspace.
      If so:
        Remove the membership from members table
      else:
          do nothing


## Autosave cycle
When the update note form first loads, it shows unchanged. When the user makes any change in the title or the body,
it shows unsaved status and autosaves after 1 second. Autosave happens happens after 1 second of only the last edit.
