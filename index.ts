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

async function main() {
	console.log("Starting the process...")

	// Get Pimlico API key from environment variables
	const apiKey = process.env.PIMLICO_API_KEY
	if (!apiKey) throw new Error("Missing PIMLICO_API_KEY")

	// Get or generate a private key for the account
	const privateKey =
		(process.env.PRIVATE_KEY as Hex) ??
		(() => {
			const pk = generatePrivateKey()
			writeFileSync(".env", `PRIVATE_KEY=${pk}`)
			return pk
		})()

	// Create a public client connected to Sepolia testnet
	const publicClient = createPublicClient({
		chain: sepolia,
		transport: http("https://eth-sepolia.g.alchemy.com/v2/demo"),
	})

	// Configure Pimlico client URL
	const pimlicoUrl = `https://api.pimlico.io/v2/11155111/rpc?apikey=${apiKey}`

	// Create Pimlico client
	const pimlicoClient = createPimlicoClient({
		transport: http(pimlicoUrl),
		entryPoint: {
			address: entryPoint07Address,
			version: "0.7",
		},
	})

	console.log("Creating smart account...")
	// Create a Smart Account
	const account = await toSafeSmartAccount({
		client: publicClient,
		owners: [privateKeyToAccount(privateKey)],
		entryPoint: {
			address: entryPoint07Address,
			version: "0.7",
		},
		version: "1.4.1",
	})

	console.log(`Smart account address: https://sepolia.etherscan.io/address/${account.address}`)

	const smartAccountClient = createSmartAccountClient({
		account,
		chain: sepolia,
		bundlerTransport: http(pimlicoUrl),
		paymaster: pimlicoClient,
		userOperation: {
			estimateFeesPerGas: async () => {
				return (await pimlicoClient.getUserOperationGasPrice()).fast
			},
		},
	})

	console.log("Sending transaction...")
	const txHash = await smartAccountClient.sendTransaction({
		to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
		value: 0n,
		data: "0x1234",
	})
	
	console.log(`User operation included: https://sepolia.etherscan.io/tx/${txHash}`)
}

// Run the main function
main().catch((error) => {
	console.error("Error occurred:", error)
	process.exit(1)
})