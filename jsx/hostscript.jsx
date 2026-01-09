// jsx/hostscript.jsx
function addMarkerAtPlayhead() {
    var seq = app.project.activeSequence;
    if (seq == null) {
        alert("활성 시퀀스가 없습니다.");
        return;
    }
    var currentTime = seq.getPlayerPosition(); // Time 객체
    var seconds = currentTime.seconds;         // 초 단위 변환
    var markers = seq.markers;
    var newMarker = markers.createMarker(seconds);
    newMarker.name = "Chat Marker";
    newMarker.comments = "Added via Chat panel";
    return "Marker added at " + seconds + "s";
}
