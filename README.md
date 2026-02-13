# MyVault — Realtime Private Bookmark 

MyVault is a secure, realtime bookmark manager built with Next.js and Supabase.  
Users can save, organize, and manage personal bookmarks with instant cross-tab synchronization.

---

## Live Demo
https://myvault-taupe.vercel.app/

---

## Features

### Bookmark Management
- Add bookmarks
- Delete bookmarks
- Instant optimistic UI updates
- Clean responsive UI

### Realtime Sync
- Instant cross-tab synchronization
- Insert & delete events update all open sessions automatically
- No page refresh required

---

### Problems I faced

- 1. Learning Supabase for the first time
- Solution : Studied Supabase documentation ,
             Used ChatGPT to understand architecture and best practices

- 2. Realtime sync not working across tabs
- Solution : The table was not added to Supabase’s realtime publication.
             So i altered the sql "ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks"

- 3. Delete bookmark not syncing
- Solution : The Postgres does not emit old row data for DELETE events by default. 
            So i altered the sql "ALTER TABLE bookmarks REPLICA IDENTITY FULL"

- 4. Logging out in one tab didn’t update other tabs immediately.
- Solution : I added Added onAuthStateChange listener.
             Added Next.js middleware to refresh sessions.




