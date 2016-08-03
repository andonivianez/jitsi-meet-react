import JitsiMeetJS from '../lib-jitsi-meet';
import {
    changeParticipantEmail,
    dominantSpeakerChanged,
    participantJoined,
    participantLeft,
    participantRoleChanged
} from '../participants';
import {
    trackAdded,
    trackMuteChanged,
    trackRemoved
} from '../tracks';

import {
    CONFERENCE_JOINED,
    CONFERENCE_LEFT,
    ROOM_SET
} from './actionTypes';
import { EMAIL_COMMAND } from './constants';
import { _addLocalTracksToConference } from './functions';
import './middleware';
import './reducer';

const JitsiConferenceEvents = JitsiMeetJS.events.conference;

/**
 * Initializes a new conference.
 *
 * @param {string} room - Conference room name.
 * @returns {Function}
 */
export function createConference(room) {
    return (dispatch, getState) => {
        let connection = getState()['features/base/connection'];
        let conference;

        if (!connection) {
            throw new Error('Cannot create conference without connection');
        }

        conference = connection.initJitsiConference(room, { openSctp: true });

        dispatch(_setupConferenceListeners(conference));

        conference.join();
    };
}

/**
 * Attach any pre-existing local media to the conference once the conference has
 * been joined.
 *
 * @param {JitsiConference} conference - The JitsiConference instance which was
 * joined by the local participant.
 * @returns {Function}
 */
export function conferenceJoined(conference) {
    return (dispatch, getState) => {
        let localTracks = getState()['features/base/tracks']
            .filter(t => t.local)
            .map(t => t.jitsiTrack);

        if (localTracks.length) {
            _addLocalTracksToConference(conference, localTracks);
        }

        dispatch({
            type: CONFERENCE_JOINED,
            conference: {
                jitsiConference: conference
            }
        });
    };
}

/**
 * Signal that we have left the conference.
 *
 * @param {JitsiConference} conference - The JitsiConference instance which was
 * left by the local participant.
 * @returns {{
 *      type: CONFERENCE_LEFT,
 *      conference: {
 *          jitsiConference: JitsiConference
 *      }
 *  }}
 */
export function conferenceLeft(conference) {
    return {
        type: CONFERENCE_LEFT,
        conference: {
            jitsiConference: conference
        }
    };
}

/**
 * Signals that room name was set.
 *
 * @param {string} room - Name of conference room.
 * @returns {{
 *      type: ROOM_SET,
 *      conference: {
 *          room: string
 *      }
 *  }}
 */
export function roomSet(room) {
    return {
        type: ROOM_SET,
        conference: {
            room
        }
    };
}

/**
 * Setup various conference event handlers.
 *
 * @param {JitsiConference} conference - Conference instance.
 * @private
 * @returns {Function}
 */
function _setupConferenceListeners(conference) {
    return dispatch => {
        conference.on(JitsiConferenceEvents.CONFERENCE_JOINED,
            () => dispatch(conferenceJoined(conference)));
        conference.on(JitsiConferenceEvents.CONFERENCE_LEFT,
            () => dispatch(conferenceLeft(conference)));

        conference.on(JitsiConferenceEvents.DOMINANT_SPEAKER_CHANGED,
            id => dispatch(dominantSpeakerChanged(id)));

        conference.on(JitsiConferenceEvents.TRACK_ADDED,
            track => {
                if (!track || track.isLocal()) {
                    return;
                }

                dispatch(trackAdded(track));
            });
        conference.on(JitsiConferenceEvents.TRACK_MUTE_CHANGED,
            track => dispatch(trackMuteChanged(track)));
        conference.on(JitsiConferenceEvents.TRACK_REMOVED,
            track => {
                if (!track || track.isLocal()) {
                    return;
                }

                dispatch(trackRemoved(track));
            });

        conference.on(JitsiConferenceEvents.USER_JOINED,
            (id, user) => dispatch(participantJoined({
                id,
                name: user.getDisplayName(),
                role: user.getRole()
            })));
        conference.on(JitsiConferenceEvents.USER_LEFT,
            id => dispatch(participantLeft(id)));
        conference.on(JitsiConferenceEvents.USER_ROLE_CHANGED,
            (id, role) => dispatch(participantRoleChanged(id, role)));

        conference.addCommandListener(EMAIL_COMMAND, (data, id) => {
            dispatch(changeParticipantEmail(id, data.value));
        });
    };
}
