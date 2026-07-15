// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {IXPManager} from "../interfaces/IXPManager.sol";

/// @title LevelUnlockRegistry
/// @notice Additive registry mapping levels to unlock descriptors so new
///         rewards (frames, animations, titles, pack eligibility) can ship
///         without ever touching the XP contract.
contract LevelUnlockRegistry is AccessControl {
    struct Unlock {
        uint256 id;
        uint256 minLevel;
        string kind; // "profile-frame" | "reveal-animation" | "pack-access" | "title" | ...
        string name;
        string metadataURI;
        bool active;
    }

    IXPManager public immutable xpManager;

    uint256 public nextUnlockId = 1;
    mapping(uint256 => Unlock) public unlocks;
    uint256[] private _unlockIds;

    event UnlockRegistered(uint256 indexed id, uint256 minLevel, string kind, string name);
    event UnlockStatusChanged(uint256 indexed id, bool active);

    constructor(IXPManager _xpManager, address admin) {
        xpManager = _xpManager;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function registerUnlock(uint256 minLevel, string calldata kind, string calldata name, string calldata metadataURI)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (uint256 id)
    {
        id = nextUnlockId++;
        unlocks[id] = Unlock({id: id, minLevel: minLevel, kind: kind, name: name, metadataURI: metadataURI, active: true});
        _unlockIds.push(id);
        emit UnlockRegistered(id, minLevel, kind, name);
    }

    function setUnlockActive(uint256 id, bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        unlocks[id].active = active;
        emit UnlockStatusChanged(id, active);
    }

    function hasUnlock(address user, uint256 id) external view returns (bool) {
        Unlock storage unlock = unlocks[id];
        return unlock.active && xpManager.levelOf(user) >= unlock.minLevel;
    }

    function unlocksOf(address user) external view returns (Unlock[] memory result) {
        uint256 level = xpManager.levelOf(user);
        uint256 count;
        for (uint256 i = 0; i < _unlockIds.length; i++) {
            Unlock storage u = unlocks[_unlockIds[i]];
            if (u.active && level >= u.minLevel) count++;
        }
        result = new Unlock[](count);
        uint256 j;
        for (uint256 i = 0; i < _unlockIds.length; i++) {
            Unlock storage u = unlocks[_unlockIds[i]];
            if (u.active && level >= u.minLevel) result[j++] = u;
        }
    }
}
