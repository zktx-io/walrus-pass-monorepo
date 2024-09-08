export type Network = 'testnet' | 'devnet'

export const Publisher: { [key in Network]: string } = {
  testnet: 'https://publisher-devnet.walrus.space/v1', // TODO: update
  devnet: 'https://publisher-devnet.walrus.space/v1', // TODO: update
}

export const Aggregator: { [key in Network]: string } = {
  testnet: 'https://aggregator-devnet.walrus.space/v1', // TODO: update
  devnet: 'https://aggregator-devnet.walrus.space/v1', // TODO: update
}

export const Rpc: { [key in Network]: string } = {
  testnet: 'https://fullnode.testnet.sui.io',
  devnet: 'https://fullnode.devnet.sui.io',
}

export const Graphql: { [key in Network]: string } = {
  testnet: 'https://sui-testnet.mystenlabs.com/graphql',
  devnet: 'https://sui-devnet.mystenlabs.com/graphql',
}
