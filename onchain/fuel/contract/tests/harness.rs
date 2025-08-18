use fuels::{prelude::*, types::ContractId, types::Bits256};

// Load abi from json
abigen!(Contract(
    name = "Space",
    abi = "out/debug/test-contract-abi.json"
));

async fn get_contract_instance() -> (Space<WalletUnlocked>, ContractId) {
    // Launch a local network and deploy the contract
    let mut wallets = launch_custom_provider_and_get_wallets(
        WalletsConfig::new(
            Some(1),             /* Single wallet */
            Some(1),             /* Single coin (UTXO) */
            Some(1_000_000_000), /* Amount per coin */
        ),
        None,
        None,
    )
    .await
    .unwrap();
    let wallet = wallets.pop().unwrap();

    let id = Contract::load_from(
        "./out/debug/test-contract.bin",
        LoadConfiguration::default(),
    )
    .unwrap()
    .deploy(&wallet, TxPolicies::default())
    .await
    .unwrap();

    let instance = Space::new(id.clone(), wallet);

    (instance, id.into())
}

#[tokio::test]
async fn can_commit_actions() {
    let (instance, _id) = get_contract_instance().await;

     let result = instance
        .methods()
        .commit_actions(Bits256::from_hex_str("0x0000000000000000000000000000000000000000000000000000000000000000").unwrap())
        .call()
        .await
        .unwrap();
 
 
}
