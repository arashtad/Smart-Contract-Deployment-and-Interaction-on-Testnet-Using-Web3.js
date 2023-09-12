solc = require("solc");

Web3 = require("web3");

fs =  require("fs");

require('dotenv').config();

function Compile(contractFile, jsonFilePath){
    var input = {
        language: "Solidity",
        sources:{
            "simpleToken.sol": {
                content: contractFile,
            },
        },
        settings: {
            outputSelection: {
                "*" : {
                    "*": ["*"],
                },
            },
        },
    };

    var output = JSON.parse(solc.compile(JSON.stringify(input)));
    console.log("Result : ", output);

    let ABI = output.contracts["simpleToken.sol"]["simpleToken"].abi;
    let bytecode = output.contracts["simpleToken.sol"]["simpleToken"].evm.bytecode.object;

    console.log("ABI:", ABI);
    console.log("Bytecode:", bytecode);

    let contractData = {'ABI': ABI, 'ByteCode': bytecode}; 

    try {
        const jsonABI = JSON.stringify(contractData, null, 2);
        fs.writeFileSync(jsonFilePath, jsonABI, 'utf8');
        console.log('ABI has been written to file:', jsonFilePath);
    } catch(error){
        console.error("failed to write ABI to file:", error);
    }
}


async function deploy(web3, jsonFilePath, privateKey){
    try{
     const fileData = fs.readFileSync(jsonFilePath, 'utf8');
     const compiledData = JSON.parse(fileData);
     ABI = compiledData['ABI'];
     bytecode = String(compiledData['ByteCode']);
    } catch(error){
        console.log('Failed to read ABI from file:', error);
    }

    const contract = new web3.eth.Contract(ABI);
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    web3.eth.accounts.wallet.add(account);

    web3.eth.defaultAccount = account.address;

    const deployTx = contract.deploy({
        data : bytecode,
        arguments: ['21000000']
    });

    try {
        const deployer = account.address;
        const gasEstimate = await deployTx.estimateGas({ from: deployer });
        const deployedContract = await deployTx.send({
            from: deployer,
            gas: gasEstimate,
        });

        let contractAddress = deployedContract.options.address;
        console.log('contract deployed at Address:', contractAddress);

        const deployedData = {'contractAddress': contractAddress};

        try {
            const contractData = JSON.stringify(deployedData, null, 2);
            fs.writeFileSync('deployedData.json', contractData, 'utf8');
            console.log('ABI has been written to file: deployedData.json');
            } catch (error){
            console.error('failed to write deployed Data to file:', error);
            }
        } catch(error) {
            console.log('Failed to deploy contract:', error);
        }
    return deployTx;
}

async function tranferToken(jsonFilePath, web3, address1, address2, deployTx){
    try{
        const fileData = fs.readFileSync(jsonFilePath, 'utf8');
        const compiledData = JSON.parse(fileData);
        ABI = compiledData['ABI'];
        bytecode = String(compiledData['ByteCode']);
       } catch(error){
           console.log('Failed to read ABI from file:', error);
       }
       
    const fileData = fs.readFileSync('deployedData.json', 'utf8');
    contractdata = JSON.parse(fileData);
    const contractAddress = contractdata["contractAddress"];
    const deployedContract = new web3.eth.Contract(ABI, contractAddress);

    const gasEstimate = await deployTx.estimateGas({from : address1});
    const toAddress = address2;
    const tokenAmount = 2000;

    deployedContract.methods.transfer(toAddress, tokenAmount)
        .send({ from: address1, gas: gasEstimate})
        .then(receipt => {
            console.log('Transaction Receipt:', receipt);
        }).catch(error => {
            console.error('Error:', error);
        });  
}

async function getBalance(jsonFilePath, address, web3){
    try{
        const fileData = fs.readFileSync(jsonFilePath, 'utf8');
        const compiledData = JSON.parse(fileData);
        ABI = compiledData['ABI'];
        bytecode = String(compiledData['ByteCode']);
       } catch(error){
           console.log('Failed to read ABI from file:', error);
       }   

       const fileData = fs.readFileSync('deployedData.json', 'utf8');
       contractdata = JSON.parse(fileData);
       const contractAddress = contractdata["contractAddress"];
       const deployedContract = new web3.eth.Contract(ABI, contractAddress);

       const balance = await deployedContract.methods.balances(address).call();
       console.log(`Balance of ${address} : ${balance}`);
}

async function executeSequentially(){
    const privateKey = process.env.PRIVATE_KEY;
    const address1 = '0xcA62721C9464FFC4863f6E78D16A3064c35078BE';
    const address2 = '0xA2E4b30e7053272f0fC1926Ff095E7780d1fFCBb';
    const jsonFilePath = "contractData.json"
    web3 = new Web3(new Web3.providers.HttpProvider("https://sepolia.infura.io/v3/664b5f985adc47c5a672e6566aafa3f0"));
    const deployTx = await deploy(web3, jsonFilePath, privateKey);
    await new Promise(resolve => setTimeout(resolve, 15000));
    await getBalance(jsonFilePath, address1, web3);
    await getBalance(jsonFilePath, address2, web3);
    await tranferToken(jsonFilePath, web3, address1, address2, deployTx);
    await new Promise(resolve => setTimeout(resolve, 15000));
    await getBalance(jsonFilePath, address1, web3);
    await getBalance(jsonFilePath, address2, web3);

    const fileData = fs.readFileSync('deployedData.json', 'utf8');
    contractdata = JSON.parse(fileData);
    const contractAddress = contractdata["contractAddress"];
    const eventSignature = 'Transfer(address,address,uint256)';
    // console.log('Transfer Event Signature has been encrypted to:',web3.utils.sha3(eventSignature));

    // web3.eth.getPastLogs({
    //     address: contractAddress,
    //     fromBlock: '0x1',
    //     toBlock: 'latest',
    //     topics: null
    // }).then(console.log);

    let ABI = {}
    try{
        const fileData = fs.readFileSync(jsonFilePath, 'utf8');
        const compiledData = JSON.parse(fileData);
        ABI = compiledData['ABI'];
        bytecode = String(compiledData['ByteCode']);
       } catch(error){
           console.log('Failed to read ABI from file:', error);
       }
    
    const contract = new web3.eth.Contract(ABI, contractAddress);

    contract.getPastEvents('allEvents', {
        fromBlock: "earliest",
        toBlock: "latest",
    }).then((events) => {
        // console.log(events)
        const transferEvent = events.filter((event) => event.event === 'Transfer');
        console.log(transferEvent);
    }).catch((error) => {
        console.error("Error fetching events:", error);
    })
}

executeSequentially();



