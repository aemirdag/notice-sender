// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Transceiver {
    struct NoticeStatus {
        uint64 noticeID;
        uint8 status;
        bool isExist;
    }

    // Mapping from notice ID to GSM number
    mapping(uint64 => uint64) private noticeIdToGsm;
    // Mapping from job ID to notice status (set when the Consumer sends an update, or when there is a new entry)
    mapping(uint64 => NoticeStatus) private jobIdToNoticeStatus;

    // Emitted when the Producer sends a notice (to be picked up by the Consumer)
    event NoticeData(string noticeData, uint64 noticeID, uint64 gsmNumber, uint256 blockTime);
    // Emitted when the Consumer sends an update, or a new entry (to be picked up by the Producer)
    event NoticeSent(uint8 status, uint64 noticeID, uint64 gsmNumber, uint256 blockTime);

    /// @notice Called by the Producer to send notice data.
    /// @param noticeData The notice text.
    /// @param noticeID A unique notice identifier.
    /// @param gsmNumber The GSM number.
    function sendNoticeData(
        string calldata noticeData,
        uint64 noticeID,
        uint64 gsmNumber
    ) external {
        // Save the GSM number using the noticeID as key
        noticeIdToGsm[noticeID] = gsmNumber;
        // Emit event so that the Consumer can process the notice
        uint256 currentTimestamp = block.timestamp;
        emit NoticeData(noticeData, noticeID, gsmNumber, currentTimestamp);
    }

    /// @notice Called by the Consumer to update notice status (using API response).
    /// @param noticeID The original notice ID.
    /// @param jobID The job ID provided by the API.
    /// @param status The status (e.g. 1 for success, 0 for failure).
    function updateNoticeStatus(
        uint64 noticeID,
        uint64 jobID,
        uint8 status
    ) external {
        bool shouldEmit = false;
        
        if (!jobIdToNoticeStatus[jobID].isExist) { // If no entry exists for this jobID, store the noticeID and status
            jobIdToNoticeStatus[jobID].isExist = true;
            jobIdToNoticeStatus[jobID].noticeID = noticeID;
            jobIdToNoticeStatus[jobID].status = status;
            shouldEmit = true;
        }
        else if (jobIdToNoticeStatus[jobID].status != status) { // If the jobID already exists but the status has changed, update and re-emit.
            jobIdToNoticeStatus[jobID].status = status;
            shouldEmit = true;
        }

        if (shouldEmit) {
            // Retrieve the GSM number.
            uint64 gsmNumber = noticeIdToGsm[noticeID];
            uint256 currentTimestamp = block.timestamp;
            emit NoticeSent(status, noticeID, gsmNumber, currentTimestamp);
        }
    }
}
