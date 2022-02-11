# <img src="krebit-icon.png" alt="Krebit" height="40px" align="left"> Krebit Subgraph

[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-blue)](https://docs.krebit.co)

This repository hosts the [Krebit] protocol subgraph, based on [OpenZeppelin subgraphs].

[krebit]: http://krebit.co
[openzeppelin subgraphs]: https://docs.openzeppelin.com/subgraphs/0.1.x/

## Overview

### URLs

Explorer: https://thegraph.com/hosted-service/subgraph/krebit/krb-token-v01

Queries (HTTP): https://api.thegraph.com/subgraphs/name/krebit/krb-token-v01

Subscriptions (WS): wss://api.thegraph.com/subgraphs/name/krebit/krb-token-v01

### Query examples

Total supply and biggest token holders:

```GraphQL
{
  erc20Contract(id: "0x84a0F5D8132d2e1FC0859Aba800462e43c80c484") {
    totalSupply {
      value
    }
    balances(first: 5, orderBy: valueExact, orderDirection: desc, where: { account_not: null }) {
      account {
        id
      }
      value
    }
  }
}
```

Roles of a user:

```GraphQL
{
  account(id: "0x9667f70c3648135ad2dc31e1d2d950ca0e299c26") {
    membership {
      accesscontrolrole {
        contract { id }
        role { id }
      }
    }
  }
}
```

Verifiable Credentials:

```GraphQL
{
  verifiableCredentials (where: {credentialSubject: "0x661f52d8d111eccf62872bddb2e70c12d8b4b860"} ){
    claimId
    anchorCommit
    claimType
    status
    transaction
    issuer
    issuerDID
    credentialSubject
    credentialSubjectDID
    issuanceDate
    expirationDate
    trust
    stake
  }
}
```

> **Current Deployments**
>
> The file .openzeppelin/rinkeby.json in https://github.com/KrebitDAO/krb-contracts keeps track of the current deployed version and previously upgraded implementations

## Learn More

The guides in the [docs site](http://docs.krebit.co) will teach about different concepts of the Krebit Protocol.

## Security

> **Caution**
>
> These contracts have not been audited! use at your own responsibility.

Please report any security issues you find directly to contact@krebit.co

Critical bug fixes will be backported to past major releases.

## Contribute

Krebit Contracts exists thanks to its contributors. There are many ways you can participate and help build public goods. Check out the [Krebit Gitcoin Grants](https://gitcoin.co/grants/3522/krebit)!

## License

Krebit Contracts is released under the [MIT License](LICENSE).
