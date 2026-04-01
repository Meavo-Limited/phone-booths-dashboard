# Database Backup (PostgreSQL in Docker)

This project uses a simple cron-based script to create periodic backups of the PostgreSQL database running inside a Docker container.

## 📦 Backup Script

What it does:
- Runs `pg_dump` inside the Docker container
- Saves backups to:
```
/root/db_backups
```
- Creates timestamped `.dump` files
- Logs execution to:
```
/root/db_backups/backup.log
```
- Deletes backups older than 7 days

---

## ⏱️ Cron Job (Daily Backup)

Edit cron:

```bash
crontab -e
```

Add:

```bash
0 2 * * * /root/phone-booths-dashboard/scripts/backup_db.sh >> /root/db_backups/log/db_backup.log 2>&1
```

This runs the backup every day at **02:00**.

---

## 🧪 Manual Test

Run the script manually:

```bash
bash /root/phone-booths-dashboard/scripts/backup_db.sh
```

Check backups:

```bash
ls -l /root/db_backups
```

Check logs:

```bash
tail -f /root/db_backups/backup.log
```
---

## 💻 Download Backups to Local Machine

From your local PC:

```bash
scp root@your-server-ip:/root/db_backups/*.dump .
```

Or download the entire folder:

```bash
scp -r root@your-server-ip:/root/db_backups .
```

---

## 🧹 Notes

- Make sure the log folder exists:
```bash
mkdir -p /root/db_backups/log
```

- Ensure `docker` path is correct in the script (`/usr/bin/docker`)

- Backups are in PostgreSQL custom format (`-F c`) → use `pg_restore` to restore