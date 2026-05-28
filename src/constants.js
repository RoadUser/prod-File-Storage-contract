module.exports = {
  EventTypes: {
    FILE_UPLOADED: "FileUploaded",
    METADATA_UPDATED: "MetadataUpdated",
    FILE_SHARED: "FileShared",
    ACCESS_REVOKED: "AccessRevoked",
    FILE_DELETED: "FileDeleted",
    USER_REGISTERED: "UserRegistered",
    PERMISSION_CHANGED: "PermissionChanged"
  },
  Tables: {
    USERS: "Users",
    FILES: "Files",
    FILE_TAGS: "FileTags",
    FILE_SHARES: "FileShares",
    EVENTS: "Events",
    CONTRACTVERSION: "ContractVersion"
  },
  ResponseCodes: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL: 500
  }
};
