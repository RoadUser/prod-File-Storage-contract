# Filestore Contract (HotPocket/Evernode)

## Overview
This contract implements a decentralized file metadata registry and ACL manager. Only metadata and distributed storage references are stored. File bytes are never stored.

## Features
- Ed25519-signed deterministic JSON commands
- Users, Files, ACLs, and Events persisted in SQLite
- Append-only Event log with pagination
- Optimistic locking on metadata updates (version field)
- Supported refs: ipfs://, ar://, https:// (configurable)

## Project Structure
- src/Controllers: User, File, Upgrade controllers
- src/Services: DB handler, File service, User service, Event log, Upgrade service
- src/Data.Deploy: initDB.js and Scripts/
- upgrade-client: CLI for maintainer upgrades
- tests/: Unit/integration tests
- scripts/: Utility scripts (seed, keygen)

## Environment
- .env contains MAINTAINER_PUBKEY and limits
- settings.json includes defaults and limits (can be overridden by env)

## Commands & Signing
Every request must include:
```
{
  "Command": "<name>",
  "Payload": { ... },
  "Nonce": "<unique>",
  "SignatureHex": "<ed25519 signature of canonical JSON {Command,Payload,Nonce}>"
}
```
- Signature uses Ed25519 detached signature
- Server verifies with libsodium against user's HotPocket public key

## API Commands
- registerUser(displayName?)
- uploadFileMetadata({ filename, sizeBytes, mimeType, contentHash, storageRef, tags?, description? })
- updateMetadata(fileId, { filename?, tags?, description? }, expectedVersion)
- shareFile(fileId, targetPublicKey, permissions)
- revokeAccess(fileId, targetPublicKey)
- deleteFile(fileId)
- listMyFiles({ limit?, cursor? })
- listSharedWithMe({ limit?, cursor? })
- getFile(fileId)
- search({ query, tag?, ownerPublicKey?, limit?, cursor? })
- getUsageStats()
- getAuditLog({ fileId?, limit?, cursor? })
- upgradeContract(zipBase64, signatureHex, version, description) [Maintainer only]

## Build
- Local Linux build: `npm run build1`
- Dockerized build: `npm run build`
- Artifacts in `dist/`

## Local Dev Cluster
A `docker-compose.yaml` scaffold is provided. Customize for your environment.

## Tests
- Ensure a HotPocket node is running at ws://localhost:8081 with contract deployed.
- Run tests: `npm test`

## Upgrade Flow
1. Maintainer builds new contract bundle into a zip
2. Use upgrade-client to sign and send artifact
3. Contract verifies maintainer public key and Ed25519 signature
4. Version validated (must be greater than current)
5. post_exec.sh created to unpack on next round

