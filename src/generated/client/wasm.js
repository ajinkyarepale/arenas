
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  passwordHash: 'passwordHash',
  role: 'role',
  status: 'status',
  image: 'image',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  key: 'key',
  name: 'name',
  description: 'description',
  category: 'category',
  createdAt: 'createdAt'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  id: 'id',
  role: 'role',
  permissionId: 'permissionId'
};

exports.Prisma.UserPermissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  permissionId: 'permissionId',
  granted: 'granted'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  hostName: 'hostName',
  organizerId: 'organizerId',
  marketCategory: 'marketCategory',
  question: 'question',
  resolutionCriteria: 'resolutionCriteria',
  isManualResolution: 'isManualResolution',
  collegeName: 'collegeName',
  collegeLogoUrl: 'collegeLogoUrl',
  themeColor: 'themeColor',
  enableBots: 'enableBots',
  botIntensity: 'botIntensity',
  asset: 'asset',
  roundDurationSec: 'roundDurationSec',
  lockBufferSec: 'lockBufferSec',
  totalRounds: 'totalRounds',
  startingBalance: 'startingBalance',
  liquidityParamB: 'liquidityParamB',
  maxStakePerTrade: 'maxStakePerTrade',
  status: 'status',
  currentRound: 'currentRound',
  scheduledFor: 'scheduledFor',
  startedAt: 'startedAt',
  endsAt: 'endsAt',
  resolvedOutcome: 'resolvedOutcome',
  resolvedAt: 'resolvedAt',
  resolvedById: 'resolvedById',
  tradesPerMinuteLimit: 'tradesPerMinuteLimit',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizerRequestScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  collegeName: 'collegeName',
  clubName: 'clubName',
  designation: 'designation',
  contactPhone: 'contactPhone',
  eventDetails: 'eventDetails',
  status: 'status',
  reviewedById: 'reviewedById',
  reviewedAt: 'reviewedAt',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EventParticipantScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  userId: 'userId',
  balance: 'balance',
  joinedAt: 'joinedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoundScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  roundNumber: 'roundNumber',
  question: 'question',
  openPrice: 'openPrice',
  closePrice: 'closePrice',
  outcome: 'outcome',
  status: 'status',
  qYes: 'qYes',
  qNo: 'qNo',
  opensAt: 'opensAt',
  locksAt: 'locksAt',
  resolvesAt: 'resolvesAt',
  resolvedAt: 'resolvedAt',
  submissionMode: 'submissionMode',
  submissionClosesAt: 'submissionClosesAt',
  voidReason: 'voidReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TradeScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  roundId: 'roundId',
  userId: 'userId',
  participantId: 'participantId',
  side: 'side',
  shares: 'shares',
  cost: 'cost',
  priceAtFill: 'priceAtFill',
  payout: 'payout',
  status: 'status',
  settledAt: 'settledAt',
  createdAt: 'createdAt'
};

exports.Prisma.PointLedgerScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  participantId: 'participantId',
  userId: 'userId',
  tradeId: 'tradeId',
  type: 'type',
  amount: 'amount',
  balanceBefore: 'balanceBefore',
  balanceAfter: 'balanceAfter',
  reason: 'reason',
  actorId: 'actorId',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  actorId: 'actorId',
  action: 'action',
  resourceType: 'resourceType',
  resourceId: 'resourceId',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  previousData: 'previousData',
  newData: 'newData',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.RoleType = exports.$Enums.RoleType = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  ORGANIZER: 'ORGANIZER',
  PARTICIPANT: 'PARTICIPANT'
};

exports.UserStatus = exports.$Enums.UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED'
};

exports.PermissionKey = exports.$Enums.PermissionKey = {
  USER_VIEW: 'USER_VIEW',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_SUSPEND: 'USER_SUSPEND',
  USER_DELETE: 'USER_DELETE',
  ADMIN_MANAGE: 'ADMIN_MANAGE',
  ROLE_ASSIGN: 'ROLE_ASSIGN',
  ARENA_VIEW_ALL: 'ARENA_VIEW_ALL',
  ARENA_CREATE: 'ARENA_CREATE',
  ARENA_MANAGE_OWN: 'ARENA_MANAGE_OWN',
  ARENA_MANAGE_ALL: 'ARENA_MANAGE_ALL',
  ARENA_DELETE_OWN: 'ARENA_DELETE_OWN',
  ARENA_DELETE_ALL: 'ARENA_DELETE_ALL',
  ROUND_VIEW: 'ROUND_VIEW',
  ROUND_MANAGE_OWN: 'ROUND_MANAGE_OWN',
  ROUND_MANAGE_ALL: 'ROUND_MANAGE_ALL',
  ROUND_OVERRIDE: 'ROUND_OVERRIDE',
  PREDICTION_VIEW: 'PREDICTION_VIEW',
  PREDICTION_SUBMIT: 'PREDICTION_SUBMIT',
  LEDGER_VIEW: 'LEDGER_VIEW',
  POINTS_ADJUST: 'POINTS_ADJUST',
  ANALYTICS_VIEW: 'ANALYTICS_VIEW',
  AUDIT_LOG_VIEW: 'AUDIT_LOG_VIEW',
  SYSTEM_SETTINGS_VIEW: 'SYSTEM_SETTINGS_VIEW',
  SYSTEM_SETTINGS_UPDATE: 'SYSTEM_SETTINGS_UPDATE'
};

exports.MarketCategory = exports.$Enums.MarketCategory = {
  CRYPTO_PRICE: 'CRYPTO_PRICE',
  CAMPUS_EVENT: 'CAMPUS_EVENT',
  CUSTOM_TRIVIA: 'CUSTOM_TRIVIA'
};

exports.EventStatus = exports.$Enums.EventStatus = {
  DRAFT: 'DRAFT',
  LOBBY: 'LOBBY',
  LIVE: 'LIVE',
  PAUSED: 'PAUSED',
  ENDED: 'ENDED',
  ARCHIVED: 'ARCHIVED'
};

exports.Outcome = exports.$Enums.Outcome = {
  YES: 'YES',
  NO: 'NO',
  VOID: 'VOID'
};

exports.OrganizerRequestStatus = exports.$Enums.OrganizerRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.RoundStatus = exports.$Enums.RoundStatus = {
  PENDING: 'PENDING',
  TRADING: 'TRADING',
  LOCKED: 'LOCKED',
  RESOLVED: 'RESOLVED'
};

exports.SubmissionRuleMode = exports.$Enums.SubmissionRuleMode = {
  UNLIMITED_WITH_BALANCE: 'UNLIMITED_WITH_BALANCE',
  TIME_LIMITED: 'TIME_LIMITED',
  RATE_LIMITED: 'RATE_LIMITED'
};

exports.Side = exports.$Enums.Side = {
  YES: 'YES',
  NO: 'NO'
};

exports.TradeStatus = exports.$Enums.TradeStatus = {
  FILLED: 'FILLED',
  SETTLED: 'SETTLED',
  REFUNDED: 'REFUNDED'
};

exports.LedgerEntryType = exports.$Enums.LedgerEntryType = {
  INITIAL_BALANCE: 'INITIAL_BALANCE',
  PREDICTION_STAKE: 'PREDICTION_STAKE',
  PREDICTION_PAYOUT: 'PREDICTION_PAYOUT',
  PREDICTION_REFUND: 'PREDICTION_REFUND',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
  SYSTEM_CORRECTION: 'SYSTEM_CORRECTION'
};

exports.AuditAction = exports.$Enums.AuditAction = {
  USER_LOGIN: 'USER_LOGIN',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  PERMISSIONS_UPDATED: 'PERMISSIONS_UPDATED',
  ARENA_CREATED: 'ARENA_CREATED',
  ARENA_UPDATED: 'ARENA_UPDATED',
  ARENA_DELETED: 'ARENA_DELETED',
  ARENA_STATUS_CHANGED: 'ARENA_STATUS_CHANGED',
  ROUND_STARTED: 'ROUND_STARTED',
  ROUND_LOCKED: 'ROUND_LOCKED',
  ROUND_RESOLVED: 'ROUND_RESOLVED',
  POINTS_MANUALLY_ADJUSTED: 'POINTS_MANUALLY_ADJUSTED',
  SYSTEM_SETTINGS_UPDATED: 'SYSTEM_SETTINGS_UPDATED'
};

exports.Prisma.ModelName = {
  User: 'User',
  Permission: 'Permission',
  RolePermission: 'RolePermission',
  UserPermission: 'UserPermission',
  Account: 'Account',
  Session: 'Session',
  VerificationToken: 'VerificationToken',
  Event: 'Event',
  OrganizerRequest: 'OrganizerRequest',
  EventParticipant: 'EventParticipant',
  Round: 'Round',
  Trade: 'Trade',
  PointLedger: 'PointLedger',
  AuditLog: 'AuditLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
