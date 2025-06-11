// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Transceiver {
    enum NoticeStatusEnum { Queued, Sent, Read, Failed }

    struct NoticeStatus {
        uint64 noticeID;
        NoticeStatusEnum status;
        bool isExist;
    }

    // mapping from notice ID to GSM number
    mapping(uint64 => uint64) private noticeIdToGsm;
    // mapping from job ID to notice status (set when the Consumer sends an update, or when there is a new entry)
    mapping(uint64 => NoticeStatus) private jobIdToNoticeStatus;

    // emits when the Producer calls the sendNoticeData function to emit the function call received time
    event SendNoticeDataFunctionCallReceived(uint64 noticeID);

    // emits when the Consumer calls the updateNoticeStatus function to emit the function call received time
    event UpdateNoticeStatusFunctionCallReceived(uint64 noticeID);

    // emits when the Producer sends a notice (to be picked up by the Consumer)
    event NoticeData(string noticeData, uint64 noticeID, uint64 gsmNumber);

    // emits when the Consumer sends an update, or a new entry (to be picked up by the Producer)
    event NoticeStatusUpdate(NoticeStatusEnum status, uint64 noticeID, uint64 gsmNumber);

    /// @notice called by the Producer to send notice data
    /// @param noticeData the notice text
    /// @param noticeID a unique notice identifier
    /// @param gsmNumber the GSM number
    function sendNoticeData(
        string calldata noticeData,
        uint64 noticeID,
        uint64 gsmNumber
    ) external {
        // Save the GSM number using the noticeID as key
        noticeIdToGsm[noticeID] = gsmNumber;
        // Emit event so that the Consumer can process the notice
        emit SendNoticeDataFunctionCallReceived(noticeID);
        emit NoticeData(noticeData, noticeID, gsmNumber);
    }

    /// @notice called by the Consumer to update notice status (using API response)
    /// @param noticeID the original notice ID
    /// @param jobID the job ID provided by the API
    /// @param status the status (Queued: 0, Sent: 1, Read: 2, Failed: 3, Invalid)
    function updateNoticeStatus(
        uint64 noticeID,
        uint64 jobID,
        NoticeStatusEnum status
    ) external {
        require(status == NoticeStatusEnum.Queued || status == NoticeStatusEnum.Sent ||
            status == NoticeStatusEnum.Read || status == NoticeStatusEnum.Failed, "invalid");

        emit UpdateNoticeStatusFunctionCallReceived(noticeID);

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
            emit NoticeStatusUpdate(status, noticeID, gsmNumber);
        }
    }
}
