import { BigInt } from "@graphprotocol/graph-ts";
import {
  KRBTokenV01,
  Deleted,
  Disputed,
  Expired,
  Issued,
  Revoked,
  Suspended,
  Transfer,
  Staked,
} from "../generated/KRBTokenV01/KRBTokenV01";
import {
  Issuer,
  CredentialSubject,
  CredentialSchema,
  VerifiableCredential,
  CredentialRegistry,
} from "../generated/schema";

import { constants } from "@amxx/graphprotocol-utils";

import { log } from "@graphprotocol/graph-ts";

import { fetchAccount } from "@openzeppelin/subgraphs/src/fetch/account";
import {
  fetchERC20,
  fetchERC20Balance,
} from "@openzeppelin/subgraphs/src/fetch/erc20";

export function fetchLastDayCredentialRegistry(
  lastDay: String
): CredentialRegistry {
  let lastDayRegistry = CredentialRegistry.load(lastDay.toString());
  if (lastDayRegistry == null) {
    lastDayRegistry = new CredentialRegistry(lastDay.toString());
    lastDayRegistry.issued = BigInt.fromI32(0);
    lastDayRegistry.deleted = BigInt.fromI32(0);
    lastDayRegistry.disputed = BigInt.fromI32(0);
    lastDayRegistry.expired = BigInt.fromI32(0);
    lastDayRegistry.revoked = BigInt.fromI32(0);
    lastDayRegistry.suspended = BigInt.fromI32(0);
    lastDayRegistry.balance = BigInt.fromI32(0);
    lastDayRegistry.staked = BigInt.fromI32(0);
  }

  return lastDayRegistry as CredentialRegistry;
}

export function handleIssued(event: Issued): void {
  log.info("Processing VC: {}", [event.params.uuid.toHexString()]);

  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  //let vc = VerifiableCredential.load(event.params.uuid.toHexString())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  //if (vc == null) {
  //vc = new VerifiableCredential(event.params.uuid.toHexString())

  let issuer = new Issuer(event.params.vc.issuer.id);
  issuer.ethereumAddress = event.params.vc.issuer.ethereumAddress;
  issuer.save();

  let credentialSubject = new CredentialSubject(
    event.params.uuid.toHexString()
  );
  credentialSubject.ethereumAddress =
    event.params.vc.credentialSubject.ethereumAddress;
  credentialSubject._type = event.params.vc.credentialSubject._type;
  credentialSubject.typeSchema = event.params.vc.credentialSubject.typeSchema;
  credentialSubject.value = event.params.vc.credentialSubject.value;
  credentialSubject.encrypted = event.params.vc.credentialSubject.encrypted;
  credentialSubject.trust = event.params.vc.credentialSubject.trust;
  credentialSubject.stake = event.params.vc.credentialSubject.stake;
  credentialSubject.price = event.params.vc.credentialSubject.price;
  credentialSubject.nbf = event.params.vc.credentialSubject.nbf;
  credentialSubject.exp = event.params.vc.credentialSubject.exp;
  credentialSubject.save();

  let credentialSchema = new CredentialSchema(
    event.params.vc.credentialSchema.id
  );
  credentialSchema._type = event.params.vc.credentialSchema._type;
  credentialSchema.save();

  let account = fetchAccount(event.params.vc.credentialSubject.ethereumAddress);
  let contract = fetchERC20(event.address);
  let balance = fetchERC20Balance(contract, account);
  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  // Entity fields can be set based on event parameters
  vc.claimId = event.params.vc.id;
  vc._context = event.params.vc._context;
  vc._type = event.params.vc._type;
  vc.credentialSubjectDID = event.params.vc.credentialSubject.id;
  vc.credentialSubjectAddress =
    event.params.vc.credentialSubject.ethereumAddress;
  vc.account = account.id;
  vc.issuer = issuer.id;
  vc.credentialSubject = credentialSubject.id;
  vc.credentialSchema = credentialSchema.id;
  vc.issuanceDate = event.params.vc.issuanceDate;
  vc.expirationDate = event.params.vc.expirationDate;
  vc.transaction = event.transaction.hash.toHex();
  vc.reason = "";
  vc.credentialStatus = "Issued";
  vc.disputedBy = "";
  //}

  // Entities can be written to the store with `.save()`
  vc.save();

  let totalRegistry = CredentialRegistry.load("total");
  if (totalRegistry == null) {
    totalRegistry = new CredentialRegistry("total");
    totalRegistry.issued = BigInt.fromI32(1);
  } else {
    totalRegistry.issued = totalRegistry.issued.plus(BigInt.fromI32(1));
  }

  let day = event.block.timestamp.div(BigInt.fromI32(60 * 60 * 24));
  let dailyRegistry = CredentialRegistry.load(day.toString());
  let lastDayRegistry = fetchLastDayCredentialRegistry(
    totalRegistry.dayUpdated ? (totalRegistry.dayUpdated as string) : ""
  );
  if (dailyRegistry == null) {
    dailyRegistry = new CredentialRegistry(day.toString());
    dailyRegistry.issued = lastDayRegistry.issued.plus(BigInt.fromI32(1));
    dailyRegistry.deleted = lastDayRegistry.deleted;
    dailyRegistry.disputed = lastDayRegistry.disputed;
    dailyRegistry.expired = lastDayRegistry.expired;
    dailyRegistry.revoked = lastDayRegistry.revoked;
    dailyRegistry.suspended = lastDayRegistry.suspended;
    dailyRegistry.balance = lastDayRegistry.balance;
    dailyRegistry.staked = lastDayRegistry.staked;
  } else {
    dailyRegistry.issued = dailyRegistry.issued.plus(BigInt.fromI32(1));
  }
  dailyRegistry.save();

  totalRegistry.dayUpdated = day.toString();
  totalRegistry.save();

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the vc from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // vc back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.approve(...)
  // - contract.decreaseAllowance(...)
  // - contract.deleteVC(...)
  // - contract.deleteVCWithAuthorization(...)
  // - contract.expiredVC(...)
  // - contract.increaseAllowance(...)
  // - contract.registerVC(...)
  // - contract.registerVCWithAuthorization(...)
  // - contract.revokeVCWithAuthorization(...)
  // - contract.suspendVCWithAuthorization(...)
  // - contract.transfer(...)
  // - contract.transferFrom(...)
  // - contract.allowance(...)
  // - contract.authorizationState(...)
  // - contract.balanceOf(...)
  // - contract.decimals(...)
  // - contract.DEFAULT_ADMIN_ROLE(...)
  // - contract.getDomainSeparator(...)
  // - contract.getRoleAdmin(...)
  // - contract.getRoleMember(...)
  // - contract.getRoleMemberCount(...)
  // - contract.getUuid(...)
  // - contract.GOVERN_ROLE(...)
  // - contract.hasRole(...)
  // - contract.maxStakeToIssue(...)
  // - contract.minBalanceToIssue(...)
  // - contract.minBalanceToReceive(...)
  // - contract.minBalanceToTransfer(...)
  // - contract.minStakeToIssue(...)
  // - contract.MINTER_ROLE(...)
  // - contract.name(...)
  // - contract.nonces(...)
  // - contract.paused(...)
  // - contract.PAUSER_ROLE(...)
  // - contract.PERMIT_TYPEHASH(...)
  // - contract.registry(...)
  // - contract.supportsInterface(...)
  // - contract.symbol(...)
  // - contract.totalSupply(...)
  // - contract.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(...)
}

export function handleDeleted(event: Deleted): void {
  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  vc.transaction = event.transaction.hash.toHex();
  vc.credentialStatus = "Deleted";
  vc.reason = event.params.reason;

  vc.save();

  let totalRegistry = CredentialRegistry.load("total");
  if (totalRegistry == null) {
    totalRegistry = new CredentialRegistry("total");
    totalRegistry.deleted = BigInt.fromI32(1);
  } else {
    totalRegistry.deleted = totalRegistry.deleted.plus(BigInt.fromI32(1));
  }

  let day = event.block.timestamp.div(BigInt.fromI32(60 * 60 * 24));
  let dailyRegistry = CredentialRegistry.load(day.toString());
  let lastDayRegistry = fetchLastDayCredentialRegistry(
    totalRegistry.dayUpdated ? (totalRegistry.dayUpdated as string) : ""
  );
  if (dailyRegistry == null) {
    dailyRegistry = new CredentialRegistry(day.toString());
    dailyRegistry.issued = lastDayRegistry.issued;
    dailyRegistry.deleted = lastDayRegistry.deleted.plus(BigInt.fromI32(1));
    dailyRegistry.disputed = lastDayRegistry.disputed;
    dailyRegistry.expired = lastDayRegistry.expired;
    dailyRegistry.revoked = lastDayRegistry.revoked;
    dailyRegistry.suspended = lastDayRegistry.suspended;
    dailyRegistry.balance = lastDayRegistry.balance;
    dailyRegistry.staked = lastDayRegistry.staked;
  } else {
    dailyRegistry.deleted = dailyRegistry.deleted.plus(BigInt.fromI32(1));
  }
  dailyRegistry.save();

  totalRegistry.dayUpdated = day.toString();
  totalRegistry.save();
}

export function handleDisputed(event: Disputed): void {
  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  vc.transaction = event.transaction.hash.toHex();
  vc.credentialStatus = "Disputed";
  vc.disputedBy = event.params.disputedBy.toHexString();

  vc.save();

  let totalRegistry = CredentialRegistry.load("total");
  if (totalRegistry == null) {
    totalRegistry = new CredentialRegistry("total");
    totalRegistry.disputed = BigInt.fromI32(1);
  } else {
    totalRegistry.disputed = totalRegistry.disputed.plus(BigInt.fromI32(1));
  }

  let day = event.block.timestamp.div(BigInt.fromI32(60 * 60 * 24));
  let dailyRegistry = CredentialRegistry.load(day.toString());
  let lastDayRegistry = fetchLastDayCredentialRegistry(
    totalRegistry.dayUpdated ? (totalRegistry.dayUpdated as string) : ""
  );
  if (dailyRegistry == null) {
    dailyRegistry = new CredentialRegistry(day.toString());
    dailyRegistry.issued = lastDayRegistry.issued;
    dailyRegistry.deleted = lastDayRegistry.deleted;
    dailyRegistry.disputed = lastDayRegistry.disputed.plus(BigInt.fromI32(1));
    dailyRegistry.expired = lastDayRegistry.expired;
    dailyRegistry.revoked = lastDayRegistry.revoked;
    dailyRegistry.suspended = lastDayRegistry.suspended;
    dailyRegistry.balance = lastDayRegistry.balance;
    dailyRegistry.staked = lastDayRegistry.staked;
  } else {
    dailyRegistry.disputed = dailyRegistry.disputed.plus(BigInt.fromI32(1));
  }
  dailyRegistry.save();

  totalRegistry.dayUpdated = day.toString();
  totalRegistry.save();
}

export function handleExpired(event: Expired): void {
  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  vc.transaction = event.transaction.hash.toHex();
  vc.credentialStatus = "Expired";

  vc.save();

  let totalRegistry = CredentialRegistry.load("total");
  if (totalRegistry == null) {
    totalRegistry = new CredentialRegistry("total");
    totalRegistry.expired = BigInt.fromI32(1);
  } else {
    totalRegistry.expired = totalRegistry.expired.plus(BigInt.fromI32(1));
  }

  let day = event.block.timestamp.div(BigInt.fromI32(60 * 60 * 24));
  let dailyRegistry = CredentialRegistry.load(day.toString());
  let lastDayRegistry = fetchLastDayCredentialRegistry(
    totalRegistry.dayUpdated ? (totalRegistry.dayUpdated as string) : ""
  );
  if (dailyRegistry == null) {
    dailyRegistry = new CredentialRegistry(day.toString());
    dailyRegistry.issued = lastDayRegistry.issued;
    dailyRegistry.deleted = lastDayRegistry.deleted;
    dailyRegistry.disputed = lastDayRegistry.disputed;
    dailyRegistry.expired = lastDayRegistry.expired.plus(BigInt.fromI32(1));
    dailyRegistry.revoked = lastDayRegistry.revoked;
    dailyRegistry.suspended = lastDayRegistry.suspended;
    dailyRegistry.balance = lastDayRegistry.balance;
    dailyRegistry.staked = lastDayRegistry.staked;
  } else {
    dailyRegistry.expired = dailyRegistry.expired.plus(BigInt.fromI32(1));
  }
  dailyRegistry.save();

  totalRegistry.dayUpdated = day.toString();
  totalRegistry.save();
}

export function handleRevoked(event: Revoked): void {
  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  vc.transaction = event.transaction.hash.toHex();
  vc.credentialStatus = "Revoked";
  vc.reason = event.params.reason;

  vc.save();

  let totalRegistry = CredentialRegistry.load("total");
  if (totalRegistry == null) {
    totalRegistry = new CredentialRegistry("total");
    totalRegistry.revoked = BigInt.fromI32(1);
  } else {
    totalRegistry.revoked = totalRegistry.revoked.plus(BigInt.fromI32(1));
  }

  let day = event.block.timestamp.div(BigInt.fromI32(60 * 60 * 24));
  let dailyRegistry = CredentialRegistry.load(day.toString());
  let lastDayRegistry = fetchLastDayCredentialRegistry(
    totalRegistry.dayUpdated ? (totalRegistry.dayUpdated as string) : ""
  );
  if (dailyRegistry == null) {
    dailyRegistry = new CredentialRegistry(day.toString());
    dailyRegistry.issued = lastDayRegistry.issued;
    dailyRegistry.deleted = lastDayRegistry.deleted;
    dailyRegistry.disputed = lastDayRegistry.disputed;
    dailyRegistry.expired = lastDayRegistry.expired;
    dailyRegistry.revoked = lastDayRegistry.revoked.plus(BigInt.fromI32(1));
    dailyRegistry.suspended = lastDayRegistry.suspended;
    dailyRegistry.balance = lastDayRegistry.balance;
    dailyRegistry.staked = lastDayRegistry.staked;
  } else {
    dailyRegistry.revoked = dailyRegistry.revoked.plus(BigInt.fromI32(1));
  }
  dailyRegistry.save();

  totalRegistry.dayUpdated = day.toString();
  totalRegistry.save();
}

export function handleSuspended(event: Suspended): void {
  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  vc.transaction = event.transaction.hash.toHex();
  vc.credentialStatus = "Suspended";
  vc.reason = event.params.reason;

  vc.save();

  let totalRegistry = CredentialRegistry.load("total");
  if (totalRegistry == null) {
    totalRegistry = new CredentialRegistry("total");
    totalRegistry.suspended = BigInt.fromI32(1);
  } else {
    totalRegistry.suspended = totalRegistry.suspended.plus(BigInt.fromI32(1));
  }

  let day = event.block.timestamp.div(BigInt.fromI32(60 * 60 * 24));
  let dailyRegistry = CredentialRegistry.load(day.toString());
  let lastDayRegistry = fetchLastDayCredentialRegistry(
    totalRegistry.dayUpdated ? (totalRegistry.dayUpdated as string) : ""
  );
  if (dailyRegistry == null) {
    dailyRegistry = new CredentialRegistry(day.toString());
    dailyRegistry.issued = lastDayRegistry.issued;
    dailyRegistry.deleted = lastDayRegistry.deleted;
    dailyRegistry.disputed = lastDayRegistry.disputed;
    dailyRegistry.expired = lastDayRegistry.expired;
    dailyRegistry.revoked = lastDayRegistry.revoked;
    dailyRegistry.suspended = lastDayRegistry.suspended.plus(BigInt.fromI32(1));
    dailyRegistry.balance = lastDayRegistry.balance;
    dailyRegistry.staked = lastDayRegistry.staked;
  } else {
    dailyRegistry.suspended = dailyRegistry.suspended.plus(BigInt.fromI32(1));
  }
  dailyRegistry.save();

  totalRegistry.dayUpdated = day.toString();
  totalRegistry.save();
}

export function handleTransfer(event: Transfer): void {
  let totalRegistry = CredentialRegistry.load("total");
  if (totalRegistry == null) {
    totalRegistry = new CredentialRegistry("total");
    if (event.params.from.toHex() == constants.ADDRESS_ZERO.toHex()) {
      totalRegistry.balance = event.params.value;
    }
    if (event.params.to.toHex() == constants.ADDRESS_ZERO.toHex()) {
      totalRegistry.balance = event.params.value.neg();
    }
    totalRegistry.issued = BigInt.fromI32(0);
    totalRegistry.deleted = BigInt.fromI32(0);
    totalRegistry.disputed = BigInt.fromI32(0);
    totalRegistry.expired = BigInt.fromI32(0);
    totalRegistry.revoked = BigInt.fromI32(0);
    totalRegistry.suspended = BigInt.fromI32(0);
    totalRegistry.staked = BigInt.fromI32(0);
  } else {
    if (event.params.from.toHex() == constants.ADDRESS_ZERO.toHex()) {
      totalRegistry.balance = totalRegistry.balance.plus(event.params.value);
    }
    if (event.params.to.toHex() == constants.ADDRESS_ZERO.toHex()) {
      totalRegistry.balance = totalRegistry.balance.minus(event.params.value);
    }
  }

  let day = event.block.timestamp.div(BigInt.fromI32(60 * 60 * 24));
  let dailyRegistry = CredentialRegistry.load(day.toString());
  let lastDayRegistry = fetchLastDayCredentialRegistry(
    totalRegistry.dayUpdated ? (totalRegistry.dayUpdated as string) : ""
  );
  if (dailyRegistry == null) {
    dailyRegistry = new CredentialRegistry(day.toString());
    if (event.params.from.toHex() == constants.ADDRESS_ZERO.toHex()) {
      dailyRegistry.balance = lastDayRegistry.balance.plus(event.params.value);
    }
    if (event.params.to.toHex() == constants.ADDRESS_ZERO.toHex()) {
      dailyRegistry.balance = lastDayRegistry.balance.minus(event.params.value);
    }
    dailyRegistry.issued = lastDayRegistry.issued;
    dailyRegistry.deleted = lastDayRegistry.deleted;
    dailyRegistry.disputed = lastDayRegistry.disputed;
    dailyRegistry.expired = lastDayRegistry.expired;
    dailyRegistry.revoked = lastDayRegistry.revoked;
    dailyRegistry.suspended = lastDayRegistry.suspended;
    dailyRegistry.staked = lastDayRegistry.staked;
  } else {
    if (event.params.from.toHex() == constants.ADDRESS_ZERO.toHex()) {
      dailyRegistry.balance = dailyRegistry.balance.plus(event.params.value);
    }
    if (event.params.to.toHex() == constants.ADDRESS_ZERO.toHex()) {
      dailyRegistry.balance = dailyRegistry.balance.minus(event.params.value);
    }
  }
  dailyRegistry.save();

  totalRegistry.dayUpdated = day.toString();
  totalRegistry.save();
}

export function handleStaked(event: Staked): void {
  let totalRegistry = CredentialRegistry.load("total");
  if (totalRegistry == null) {
    totalRegistry = new CredentialRegistry("total");
    if (event.params.to.toHex() == constants.ADDRESS_ZERO.toHex()) {
      totalRegistry.staked = event.params.value.neg();
    }
    if (event.params.from.toHex() == constants.ADDRESS_ZERO.toHex()) {
      totalRegistry.staked = event.params.value;
    }
  } else {
    if (event.params.to.toHex() == constants.ADDRESS_ZERO.toHex()) {
      totalRegistry.staked = totalRegistry.staked.minus(event.params.value);
    }
    if (event.params.from.toHex() == constants.ADDRESS_ZERO.toHex()) {
      totalRegistry.staked = totalRegistry.staked.plus(event.params.value);
    }
  }

  let day = event.block.timestamp.div(BigInt.fromI32(60 * 60 * 24));
  let dailyRegistry = CredentialRegistry.load(day.toString());
  let lastDayRegistry = fetchLastDayCredentialRegistry(
    totalRegistry.dayUpdated ? (totalRegistry.dayUpdated as string) : ""
  );
  if (dailyRegistry == null) {
    dailyRegistry = new CredentialRegistry(day.toString());
    if (event.params.to.toHex() == constants.ADDRESS_ZERO.toHex()) {
      dailyRegistry.staked = lastDayRegistry.staked.minus(event.params.value);
    }
    if (event.params.from.toHex() == constants.ADDRESS_ZERO.toHex()) {
      dailyRegistry.staked = lastDayRegistry.staked.plus(event.params.value);
    }
    dailyRegistry.issued = lastDayRegistry.issued;
    dailyRegistry.deleted = lastDayRegistry.deleted;
    dailyRegistry.disputed = lastDayRegistry.disputed;
    dailyRegistry.expired = lastDayRegistry.expired;
    dailyRegistry.revoked = lastDayRegistry.revoked;
    dailyRegistry.suspended = lastDayRegistry.suspended;
    dailyRegistry.balance = lastDayRegistry.balance;
  } else {
    if (event.params.to.toHex() == constants.ADDRESS_ZERO.toHex()) {
      dailyRegistry.staked = dailyRegistry.staked.minus(event.params.value);
    }
    if (event.params.from.toHex() == constants.ADDRESS_ZERO.toHex()) {
      dailyRegistry.staked = dailyRegistry.staked.plus(event.params.value);
    }
  }
  dailyRegistry.save();

  totalRegistry.dayUpdated = day.toString();
  totalRegistry.save();
}
