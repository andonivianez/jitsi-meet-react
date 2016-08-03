import {
    DOMINANT_SPEAKER_CHANGED,
    PARTICIPANT_ID_CHANGED,
    PARTICIPANT_JOINED,
    PARTICIPANT_LEFT,
    PARTICIPANT_PINNED,
    PARTICIPANT_UPDATED
} from './actionTypes';
import './middleware';
import './reducer';

/**
 * Action to update a participant's email.
 *
 * @param {string} id - Participant's id.
 * @param {string} email - Participant's email.
 * @returns {{
 *      type: PARTICIPANT_UPDATED,
 *      participant: {
 *          id: string,
 *          avatar: string,
 *          email: string
 *      }
 * }}
 */
export function changeParticipantEmail(id, email) {
    return {
        type: PARTICIPANT_UPDATED,
        participant: {
            id,
            email
        }
    };
}

/**
 * Create an action for when dominant speaker changes.
 *
 * @param {string} id - Participant id.
 * @returns {{
 *      type: DOMINANT_SPEAKER_CHANGED,
 *      participant: {
 *          id: string
 *      }
 * }}
 */
export function dominantSpeakerChanged(id) {
    return {
        type: DOMINANT_SPEAKER_CHANGED,
        participant: {
            id
        }
    };
}

/**
 * Action to signal that ID of local participant has changed. This happens when
 * local participant joins a new conference or quits one.
 *
 * @param {string} id - New ID for local participant.
 * @returns {{
 *      type: PARTICIPANT_ID_CHANGED,
 *      participant: {
 *          newId: string,
 *          previousId: string
 *      }
 * }}
 */
export function localParticipantIdChanged(id) {
    return (dispatch, getState) => {
        let localParticipant = _getLocalParticipant(getState);

        if (localParticipant) {
            return dispatch({
                type: PARTICIPANT_ID_CHANGED,
                participant: {
                    newId: id,
                    previousId: localParticipant.id
                }
            });
        }
    };
}

/**
 * Action to signal that a local participant has joined.
 *
 * @param {Participant} participant={} - Information about participant.
 * @returns {{
 *      type: PARTICIPANT_JOINED,
 *      participant: Participant
 * }}
 */
export function localParticipantJoined(participant = {}) {
    return participantJoined({
        ...participant,
        local: true
    });
}

/**
 * Action to remove a local participant.
 *
 * @returns {Function}
 */
export function localParticipantLeft() {
    return (dispatch, getState) => {
        let participant = _getLocalParticipant(getState);

        if (participant) {
            return dispatch(participantLeft(participant.id));
        }
    };
}

/**
 * Action to signal that a participant has joined.
 *
 * @param {Participant} participant - Information about participant.
 * @returns {{
 *      type: PARTICIPANT_JOINED,
 *      participant: Participant
 * }}
 */
export function participantJoined(participant) {
    return {
        type: PARTICIPANT_JOINED,
        participant
    };
}

/**
 * Action to handle case when participant lefts.
 *
 * @param {string} id - Participant id.
 * @returns {{
 *      type: PARTICIPANT_LEFT,
 *      participant: {
 *          id: string
 *      }
 * }}
 */
export function participantLeft(id) {
    return {
        type: PARTICIPANT_LEFT,
        participant: {
            id
        }
    };
}

/**
 * Action to handle case when participant's role changes.
 *
 * @param {string} id - Participant id.
 * @param {PARTICIPANT_ROLE} role - Participant's new role.
 * @returns {{
 *      type: PARTICIPANT_UPDATED,
 *      participant: {
 *          id: string,
 *          role: PARTICIPANT_ROLE
 *      }
 * }}
 */
export function participantRoleChanged(id, role) {
    return {
        type: PARTICIPANT_UPDATED,
        participant: {
            id,
            role
        }
    };
}

/**
 * Create an action for when the participant in conference is pinned.
 *
 * @param {string|null} id - Participant id or null if no one is currently
 *     pinned.
 * @returns {Function}
 */
export function pinParticipant(id) {
    return (dispatch, getState) => {
        let state = getState();
        let conference = state['features/base/conference'].jitsiConference;
        let participant = state['features/base/participants']
            .find(p => p.id === id);
        let localParticipant = _getLocalParticipant(getState);

        // This condition prevents signaling to pin local participant. Here is
        // the logic: if we have ID, then we check if participant by that ID is
        // local. If we don't have ID and thus no participant by ID, we check
        // for local participant. If it's currently pinned, then this action
        // will unpin him and that's why we won't signal here too.
        if ((participant && !participant.local) ||
            (!participant && (!localParticipant || !localParticipant.pinned))) {
            conference.pinParticipant(id);
        }

        return dispatch({
            type: PARTICIPANT_PINNED,
            participant: {
                id
            }
        });
    };
}

/**
 * Returns local participant from Redux state.
 *
 * @param {Function} getState - Redux getState() method.
 * @private
 * @returns {(Participant|undefined)}
 */
function _getLocalParticipant(getState) {
    return getState()['features/base/participants'].find(p => p.local);
}