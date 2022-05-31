const initialRewards = {
    1: web3.utils.toWei('80', 'ether'),
    2: web3.utils.toWei('90', 'ether'),
    3: web3.utils.toWei('110', 'ether'),
    4: web3.utils.toWei('140', 'ether'),
    5: web3.utils.toWei('180', 'ether'),
    7: web3.utils.toWei('250', 'ether'),
    10: web3.utils.toWei('350', 'ether'),
    15: web3.utils.toWei('460', 'ether'),
    20: web3.utils.toWei('590', 'ether'),
    25: web3.utils.toWei('730', 'ether'),
    30: web3.utils.toWei('880', 'ether'),
    40: web3.utils.toWei('1090', 'ether'),
    50: web3.utils.toWei('1310', 'ether'),
    60: web3.utils.toWei('1540', 'ether'),
    75: web3.utils.toWei('1835', 'ether'),
    100: web3.utils.toWei('2235', 'ether'),
};

console.log(Object.keys(initialRewards));
console.log(
    Object.keys(initialRewards).map((k) => initialRewards[Number(k)].toString())
);