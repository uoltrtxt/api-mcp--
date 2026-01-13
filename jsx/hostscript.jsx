/*
 * hostscript.jsx
 *
 * This ExtendScript file provides functions that run inside Adobe host
 * applications.  The primary exported function here is
 * addMarkerAtPlayhead(), which adds a marker at the current playhead
 * position in either Premiere Pro (active sequence) or After Effects
 * (active composition).  It returns a message describing the action
 * performed.  Errors are caught and converted to strings for display
 * in the panel.
 */

function addMarkerAtPlayhead() {
  try {
    // Determine whether we're running in Premiere Pro or After Effects
    // by checking for a sequence or comp object.
    if (app.project) {
      // Premiere Pro: app.project.activeSequence is defined when a sequence is active
      if (app.project.activeSequence) {
        var seq = app.project.activeSequence;
        var currentTime = seq.getPlayerPosition();
        var seconds = currentTime.seconds;
        var markers = seq.markers;
        var newMarker = markers.createMarker(seconds);
        newMarker.name = "Chat Marker";
        newMarker.comments = "Added via CEP panel";
        return "Premiere: " + seconds.toFixed(2) + "초 위치에 마커를 추가했습니다.";
      }
      // After Effects: activeItem is a CompItem when a composition is active
      if (app.project.activeItem && app.project.activeItem instanceof CompItem) {
        var comp = app.project.activeItem;
        var marker = new MarkerValue("Chat Marker");
        // Set marker at current composition time
        comp.markerProperty.setValueAtTime(comp.time, marker);
        return "AE: " + comp.time.toFixed(2) + "초 위치에 컴포지션 마커를 추가했습니다.";
      }
    }
    return "활성 시퀀스(프리미어) 또는 컴포지션(AE)이 없습니다.";
  } catch (err) {
    return "ExtendScript 오류: " + err.toString();
  }
}