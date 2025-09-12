# NEOVERIFY ARCHITECTURE 

        
          ┌────────────────────┐
          │ End Users / Clients │
          │ (Unis, Banks, HR)   │
          └─────────┬──────────┘
                    │
                    ▼
      ┌───────────────────────────┐
      │ Frontend                  │
      │ Web (React/Next.js)       │
      │ Mobile (React Native)     │
      └─────────┬─────────────────┘
                │ API Calls
                ▼
      ┌───────────────────────────┐
      │ Backend (Node.js + Nest)  │
      │ - Auth & APIs             │
      │ - Orchestrates Services   │
      └──┬─────┬─────┬─────┬─────┘
         │     │     │     │
         ▼     ▼     ▼     ▼
 ┌────────────┐ ┌──────────────┐ ┌─────────────┐ ┌─────────────────────┐
 │ Blockchain │ │ AI Forensics  │ │ Database    │ │ Secure File Storage │
 │ (Ethereum/ │ │ (Python ML)   │ │ (Postgres / │ │ (AWS S3 / Azure)    │
 │ Polygon)   │ │ Detects fakes │ │ MongoDB)    │ │ Docs & Images       │
 └────────────┘ └──────────────┘ └─────────────┘ └─────────────────────┘
    (Hashes)        (Tampering)       (Users,         (Original files)
                                      Metadata)
