# Capstone Project
Final project to mark the completion of this learning path.

# Routes
All the routes string and maker are in routes.jsx, except for some routes.

# Layout architecture
All the pages render inside the layout component AppShell defined in AppShell.jsx.

# Database implementation logics and schema
* fk stands for foreign key

Database schema for workspace and memberships :-
workspaces:
  name: text
  created_by: fk to users

workspace_members:
  workspace_id: fk to workspaces
  user_id: fk to auth.users
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

# Auth flow
Auth state is maintained globally in a Zustand store. A listener is registered using
supabase.auth.onAuthStateChange which sets the global auth state when a suitable event is
received. An init method is called in the top-level component which is App.

When a user logs in, supabase login api is called with username and password, which either returns
success or error. On success, onAuthStateChange callback is called by supabase which sets the auth
state for the app.

# Query keys for tanstack
Query keys for the resources are in the QUERY_KEYS global variable in their module.
All the network facing functions are in the features/ folder. They use tanstack query
for network requests. Mutations have been implemented such that they invalidate the
necessary query keys on success or error.

# Autosave cycle when editing notes
Autosave cycle was removed when collaborative note editing feature was added. User will manually
click the save button. When they do so, all the other users editing the same note will be notified
and they would show a notification telling that the note has been edited somewhere. User is then supposed
to click on the update note button to pull in the latest changes.

# Collaborative editing
The strategy is last-write-wins. There's not CRDT or any complex algorithm. UI shows the users
who are currently editing the same note and also a list of users currently typing. Supabase presence
is used for both of these features. UI shows when someone somewhere saves a note, shows the message
that someone has committed latest changes. The user may click the update button to pull in the latest
changes or continue editing and save the final changes in which case previous changes made by another
user would be over-written. This is last-write-wins strategy. For notifying users that note has been
saved by someone somewhere, Supabase broadcast has been used.

# Why the presence was used and why the broadcast was used where they were used ?
Presence was used because we wanted a final reconciled state. For showing which user
is present and typing, we want the list of present users and typing flag for them.
It would be like a distributed data structure. When a user joins, their data in the form
of { email, typing } is added to the list and maintained. When the user starts typing, the
same `typing` flag is set to true, and when they stop it is set to false. We don't want to
receive events when the user is joining or typing, because then it would be a complex logic
to know when user has left or when they have stopped typing.

Broadcast was used because generally an event type of semantic was required. When someone saves,
an event is broadcast that the note is dirty, others receive the event handle it in their way.

# Command palette
It is scope-based architecture for command palette. On initialization, a single handler is registered
on window for keydown event. Commands can register their command palette using useCommandPalette.
Command palettes are stored in zustand store in Map, a map from `symbol` to command palette object.
Command palette object structure can be seen in the respective file in src/features/command_palette.
Since Map maintains the insertion order while iteration, later registered command palette takes
precedence. A Map was used instead of stack to make it convenient to unregister the command palette
when their component unmounts.

# Performance measures
For check bundle size vite-bundle-visualizer plugin was used. It's relatively easy to use. You
may ask an LLM yourself. The overall size came out to be less than 2MB. I think it is fine, so
there's nothing to optimize there.

For checking the Core Web Vitals, Chrome lighthouse tools was used. I opened some pages, opened the
dev tools and recorded the performance using lighthouse. For the pages I checked, all the scores
were green above 90, except for SEO, which is expected. So nothing to optimize here as well.
I expected the Layout Shift to be the problem here because of all UI code I had written, but it
didn't. I think chrome was measuring layout shift for only a few units of time after the page loads.
Otherwise, the pages for folder view, shifts the layout a lot when the final list of notes and folders
are loaded. Or maybe layout shift means something else.

Also for performance, lazy loading was enabled, which also enables the code splitting optimization.

# Testing
All the tests were written using Claude. The test are mocked at custom-hook boundary. I am not
testing the libraries, only my own code. The testing patterns Claude had used are documented
in the file `TEST_PATTERNS.pdf`. Since Claude wrote the testing without touching the implementations,
it wrote test to assert all the implemented behaviors, even when the api could be changed for better.
So if one makes some changes to any api, they might have to revisit the tests.

The tests are all more on the side of unit and integration tests, rather than e2e tests.

# Miscellaneous
There are lint errors. Not enough care has been given to eliminate them all, only the ones which
could be eliminated automatically, which was mostly unused imports errors. The codebase is `javascript`,
not `typescript`, so there's not type checking.
