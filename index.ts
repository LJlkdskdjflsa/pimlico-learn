import "dotenv/config"  // Load environment variables from .env file
import { writeFileSync } from "fs"
import { toSafeSmartAccount } from "permissionless/accounts"
import { Hex, createPublicClient, getContract, http } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { sepolia, baseSepolia } from "viem/chains"
import { createPimlicoClient } from "permissionless/clients/pimlico"
import { createBundlerClient, entryPoint07Address } from "viem/account-abstraction"
import { createSmartAccountClient } from "permissionless"

import {
	getAddress,
	maxUint256,
	parseAbi,
} from "viem";
import {
	EntryPointVersion,
} from "viem/account-abstraction";

import { encodeFunctionData, parseAbiItem } from "viem"

console.log("Hello world!")

// Get Pimlico API key from environment variables
const apiKey = process.env.PIMLICO_API_KEY
if (!apiKey) throw new Error("Missing PIMLICO_API_KEY")

// Get or generate a private key for the account
// If PRIVATE_KEY exists in .env, use it; otherwise generate a new one
const privateKey =
	(process.env.PRIVATE_KEY as Hex) ??
	(() => {
		const pk = generatePrivateKey()
		writeFileSync(".env", `PRIVATE_KEY=${pk}`)
		return pk
	})()

// Create a public client connected to Sepolia testnet
// This client handles standard Ethereum RPC calls
export const publicClient = createPublicClient({
	chain: sepolia,
	transport: http("https://eth-sepolia.g.alchemy.com/v2/demo"),
})

// Configure Pimlico client URL for Account Abstraction operations
// Pimlico is used for gasless transactions and account abstraction
const pimlicoUrl = `https://api.pimlico.io/v2/11155111/rpc?apikey=${apiKey}`

// Create Pimlico client for handling Account Abstraction operations
// This client specifically handles UserOperation-related calls
const pimlicoClient = createPimlicoClient({
	transport: http(pimlicoUrl),
	entryPoint: {
		address: entryPoint07Address,
		version: "0.7",
	},
})

// Create a Smart Account using Safe's smart contract wallet implementation
// This creates a counterfactual (not yet deployed) smart contract wallet
const account = await toSafeSmartAccount({
	client: publicClient,
	owners: [privateKeyToAccount(privateKey)], // Set the owner of the smart account
	entryPoint: {
		address: entryPoint07Address,
		version: "0.7",
	}, // Use ERC-4337 EntryPoint contract
	version: "1.4.1", // Safe contract version
})

// Log the smart account address which can be viewed on Etherscan
console.log(`Smart account address: https://sepolia.etherscan.io/address/${account.address}`)