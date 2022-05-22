// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../fx-portal/FxRoot.sol";

contract MockFxStateSender is IFxStateSender {
    function sendMessageToChild(address _receiver, bytes calldata _data) public override {
        // do nothing
    }
}