import { BigInt } from "@graphprotocol/graph-ts";
import {
  KRBTokenV01,
  Deleted,
  Disputed,
  Expired,
  Issued,
  Revoked,
  Suspended,
} from "../generated/KRBTokenV01/KRBTokenV01";
import {
  Issuer,
  CredentialSubject,
  CredentialSchema,
  VerifiableCredential,
} from "../generated/schema";

import { log } from "@graphprotocol/graph-ts";

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
    event.params.vc.credentialSubject.id
  );
  credentialSubject.ethereumAddress =
    event.params.vc.credentialSubject.ethereumAddress;
  credentialSubject._type = event.params.vc.credentialSubject._type;
  credentialSubject.typeSchema = event.params.vc.credentialSubject.typeSchema;
  credentialSubject.value = event.params.vc.credentialSubject.value;
  credentialSubject.encrypted = event.params.vc.credentialSubject.encrypted;
  credentialSubject.trust = event.params.vc.credentialSubject.trust;
  credentialSubject.stake = event.params.vc.credentialSubject.stake;
  credentialSubject.nbf = event.params.vc.credentialSubject.nbf;
  credentialSubject.exp = event.params.vc.credentialSubject.exp;
  credentialSubject.save();

  let credentialSchema = new CredentialSchema(
    event.params.vc.credentialSchema.id
  );
  credentialSchema._type = event.params.vc.credentialSchema._type;
  credentialSchema.save();

  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  // Entity fields can be set based on event parameters
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
}

export function handleDisputed(event: Disputed): void {
  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  vc.transaction = event.transaction.hash.toHex();
  vc.credentialStatus = "Disputed";
  vc.disputedBy = event.params.disputedBy.toHexString();

  vc.save();
}

export function handleExpired(event: Expired): void {
  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  vc.transaction = event.transaction.hash.toHex();
  vc.credentialStatus = "Expired";

  vc.save();
}

export function handleRevoked(event: Revoked): void {
  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  vc.transaction = event.transaction.hash.toHex();
  vc.credentialStatus = "Revoked";
  vc.reason = event.params.reason;

  vc.save();
}

export function handleSuspended(event: Suspended): void {
  let vc = new VerifiableCredential(event.params.uuid.toHexString());

  vc.transaction = event.transaction.hash.toHex();
  vc.credentialStatus = "Suspended";
  vc.reason = event.params.reason;

  vc.save();
}
