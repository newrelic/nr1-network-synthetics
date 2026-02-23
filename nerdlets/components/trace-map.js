import React, { useContext, useEffect, useState, useMemo } from 'react';

import { PlatformStateContext, Spinner, Modal, HeadingText } from 'nr1';
import { timeRangeToNrql, fetchHopDetailsForTrace } from '../shared/utils';
import { Map, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icons for different hop types
const createCustomIcon = (color, hopNumber) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html:
      '<div style="background-color: ' +
      color +
      '; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">' +
      hopNumber +
      '</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Helper to truncate text with ellipsis
const truncateText = (text, maxLength = 16) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
};

// Node component for flow diagram
const FlowNode = ({ hop, x, y, isTarget, isPrivate, isTimeout, onClick }) => {
  let backgroundColor = '#3498db'; // Default blue
  if (isTarget) backgroundColor = '#2ecc71'; // Green for target
  if (isPrivate) backgroundColor = '#9b59b6'; // Purple for private
  if (isTimeout) backgroundColor = '#e74c3c'; // Red for timeout

  return (
    <g
      transform={'translate(' + x + ',' + y + ')'}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      <rect
        x="-75"
        y="-50"
        width="150"
        height="100"
        rx="8"
        ry="8"
        fill={backgroundColor}
        stroke="#fff"
        strokeWidth="2"
      />
      <text
        x="0"
        y="-28"
        textAnchor="middle"
        fill="white"
        fontSize="12"
        fontWeight="bold"
      >
        Hop {hop.hopNumber}
      </text>
      <text x="0" y="-10" textAnchor="middle" fill="white" fontSize="10">
        {truncateText(hop.hop_ip, 18)}
      </text>
      {hop.hop_city && (
        <React.Fragment>
          <text
            x="0"
            y="8"
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize="9"
          >
            {truncateText(hop.hop_city, 18)}
          </text>
          <text
            x="0"
            y="20"
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize="9"
          >
            {truncateText(hop.hop_region, 18)}
          </text>
        </React.Fragment>
      )}
      <text x="0" y="38" textAnchor="middle" fill="white" fontSize="10">
        {hop.avg_hop_latency ? hop.avg_hop_latency.toFixed(2) + ' ms' : 'N/A'}
      </text>
    </g>
  );
};

// Arrow marker for edges
const FlowEdge = ({ x1, y1, x2, y2, label, edgeId }) => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const markerId = 'arrowhead-' + edgeId;

  return (
    <g>
      <defs>
        <marker
          id={markerId}
          markerWidth="12"
          markerHeight="8"
          refX="10"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 12 4, 0 8" fill="#667788" />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#667788"
        strokeWidth="2"
        markerEnd={'url(#' + markerId + ')'}
      />
      {label && (
        <g transform={'translate(' + midX + ',' + (midY - 18) + ')'}>
          <rect
            x="-45"
            y="-12"
            width="90"
            height="20"
            fill="#f0f0f0"
            rx="4"
            stroke="#ddd"
            strokeWidth="1"
          />
          <text x="0" y="4" textAnchor="middle" fontSize="11" fill="#333">
            {label}
          </text>
        </g>
      )}
    </g>
  );
};

// Error node component for failed traces
const ErrorNode = ({ x, y, onClick }) => {
  return (
    <g
      transform={'translate(' + x + ',' + y + ')'}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      <rect
        x="-90"
        y="-50"
        width="180"
        height="100"
        rx="8"
        ry="8"
        fill="#e74c3c"
        stroke="#fff"
        strokeWidth="2"
      />
      <text
        x="0"
        y="-20"
        textAnchor="middle"
        fill="white"
        fontSize="14"
        fontWeight="bold"
      >
        ⚠ Error
      </text>
      <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11">
        Trace Failed
      </text>
      <text
        x="0"
        y="25"
        textAnchor="middle"
        fill="rgba(255,255,255,0.8)"
        fontSize="10"
      >
        Click for details
      </text>
    </g>
  );
};

const TraceMap = ({
  selectedTrace,
  targetHost,
  selectedAccount,
  traceError,
  mapRef,
}) => {
  const [loading, setLoading] = useState(true);
  const [hopData, setHopData] = useState([]);
  const [selectedHop, setSelectedHop] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { timeRange } = useContext(PlatformStateContext);

  // Scroll into view when loading completes
  useEffect(() => {
    if (!loading && mapRef?.current) {
      mapRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [loading, mapRef]);

  useEffect(() => {
    const fetchHopData = async () => {
      setLoading(true);
      const since = timeRangeToNrql(timeRange);
      const data = await fetchHopDetailsForTrace(
        since,
        selectedAccount.id,
        selectedTrace,
        targetHost
      );
      setHopData(data || []);
      setLoading(false);
    };
    if (selectedTrace && selectedAccount) {
      fetchHopData();
    }
  }, [selectedTrace, selectedAccount, timeRange]);

  // Sort hops by hopNumber
  const sortedHops = useMemo(() => {
    return [...hopData].sort(
      (a, b) => parseInt(a.hopNumber) - parseInt(b.hopNumber)
    );
  }, [hopData]);

  // Process hop data for geomap - interpolate missing coordinates
  const processedHopsForMap = useMemo(() => {
    if (sortedHops.length === 0) return [];

    // Find hops with valid coordinates
    const hopsWithCoords = sortedHops.filter(
      (hop) => hop.hop_lat !== null && hop.hop_lon !== null
    );

    if (hopsWithCoords.length === 0) {
      // Default to US center if no coordinates available
      return sortedHops.map((hop, index) => ({
        ...hop,
        interpolated_lat: 39.8283 + index * 0.5,
        interpolated_lon: -98.5795 + index * 0.5,
        hasValidCoords: false,
      }));
    }

    // Pass 1: compute base positions, spacing null-coord hops proportionally
    // within their gap rather than collapsing them all to the same offset.
    const basePositions = sortedHops.map((hop, index) => {
      if (hop.hop_lat !== null && hop.hop_lon !== null) {
        return { lat: hop.hop_lat, lon: hop.hop_lon, valid: true };
      }

      // Find index of nearest known hops before and after
      let prevIndex = -1;
      let nextIndex = -1;
      for (let i = index - 1; i >= 0; i--) {
        if (sortedHops[i].hop_lat !== null && sortedHops[i].hop_lon !== null) {
          prevIndex = i;
          break;
        }
      }
      for (let i = index + 1; i < sortedHops.length; i++) {
        if (sortedHops[i].hop_lat !== null && sortedHops[i].hop_lon !== null) {
          nextIndex = i;
          break;
        }
      }

      if (prevIndex >= 0 && nextIndex >= 0) {
        // Interpolate proportionally based on position within the gap
        const gapSize = nextIndex - prevIndex;
        const ratio = (index - prevIndex) / gapSize;
        return {
          lat:
            sortedHops[prevIndex].hop_lat +
            (sortedHops[nextIndex].hop_lat - sortedHops[prevIndex].hop_lat) *
              ratio,
          lon:
            sortedHops[prevIndex].hop_lon +
            (sortedHops[nextIndex].hop_lon - sortedHops[prevIndex].hop_lon) *
              ratio,
          valid: false,
        };
      } else if (prevIndex >= 0) {
        // Space progressively further from the last known hop
        const dist = index - prevIndex;
        return {
          lat: sortedHops[prevIndex].hop_lat + 0.3 * dist,
          lon: sortedHops[prevIndex].hop_lon + 0.3 * dist,
          valid: false,
        };
      } else if (nextIndex >= 0) {
        // Space progressively further from the next known hop
        const dist = nextIndex - index;
        return {
          lat: sortedHops[nextIndex].hop_lat - 0.3 * dist,
          lon: sortedHops[nextIndex].hop_lon - 0.3 * dist,
          valid: false,
        };
      }

      return {
        lat: 39.8283 + index * 0.5,
        lon: -98.5795 + index * 0.5,
        valid: false,
      };
    });

    // Pass 2: detect hops that share the same position (real duplicates or
    // collisions from interpolation) and spread them in a small circle so
    // every marker is individually visible on the map.
    const positionGroups = {};
    basePositions.forEach((pos, i) => {
      const key = pos.lat.toFixed(4) + ',' + pos.lon.toFixed(4);
      if (!positionGroups[key]) positionGroups[key] = [];
      positionGroups[key].push(i);
    });

    const jitterRadius = 0.12; // ~13 km — enough to separate markers visually
    const finalPositions = basePositions.map((pos) => ({ ...pos }));

    Object.values(positionGroups).forEach((indices) => {
      if (indices.length < 2) return;
      indices.forEach((idx, nth) => {
        const angle = (2 * Math.PI * nth) / indices.length;
        finalPositions[idx].lat =
          basePositions[idx].lat + jitterRadius * Math.sin(angle);
        finalPositions[idx].lon =
          basePositions[idx].lon + jitterRadius * Math.cos(angle);
        // Mark as not having authoritative coords since position was adjusted
        finalPositions[idx].valid = false;
      });
    });

    return sortedHops.map((hop, index) => ({
      ...hop,
      interpolated_lat: finalPositions[index].lat,
      interpolated_lon: finalPositions[index].lon,
      hasValidCoords: finalPositions[index].valid,
    }));
  }, [sortedHops]);

  // Calculate map center and bounds
  const mapCenter = useMemo(() => {
    if (processedHopsForMap.length === 0) return [39.8283, -98.5795];

    const lats = processedHopsForMap.map((h) => h.interpolated_lat);
    const lons = processedHopsForMap.map((h) => h.interpolated_lon);

    return [
      (Math.min.apply(null, lats) + Math.max.apply(null, lats)) / 2,
      (Math.min.apply(null, lons) + Math.max.apply(null, lons)) / 2,
    ];
  }, [processedHopsForMap]);

  // Create polyline positions for connecting hops on the map
  const polylinePositions = useMemo(() => {
    return processedHopsForMap.map((hop) => [
      hop.interpolated_lat,
      hop.interpolated_lon,
    ]);
  }, [processedHopsForMap]);

  // Calculate SVG dimensions for flow diagram
  const nodeSpacing = 240;
  const svgWidth = Math.max(400, sortedHops.length * nodeSpacing + 100);
  const svgHeight = 220;
  const hasError = sortedHops.length === 0 && selectedTrace;

  if (loading) return <Spinner />;

  return (
    <div ref={mapRef} className="trace-map">
      <h3 className="section-spacing">
        Trace Map for Trace ID: {selectedTrace}
      </h3>
      <div className="section-spacing-lg">
        <h4 className="section-title">Network Path Flow</h4>
        <div className="panel panel--flow">
          <svg
            width={hasError ? 400 : svgWidth}
            height={svgHeight}
            style={{ display: 'block' }}
          >
            {hasError ? (
              <ErrorNode
                x={200}
                y={110}
                onClick={() => setShowErrorModal(true)}
              />
            ) : (
              <React.Fragment>
                {sortedHops.slice(0, -1).map((hop, index) => {
                  const nextHop = sortedHops[index + 1];
                  const x1 = 100 + index * nodeSpacing + 75;
                  const y1 = 110;
                  const x2 = 100 + (index + 1) * nodeSpacing - 75 - 8;
                  const y2 = 110;
                  const latencyDiff =
                    (nextHop.avg_hop_latency || 0) - (hop.avg_hop_latency || 0);
                  const label =
                    latencyDiff > 0 ? '+' + latencyDiff.toFixed(2) + ' ms' : '';

                  return (
                    <FlowEdge
                      key={'edge-' + hop.hopNumber}
                      edgeId={hop.hopNumber}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      label={label}
                    />
                  );
                })}
                {sortedHops.map((hop, index) => (
                  <FlowNode
                    key={'node-' + hop.hopNumber}
                    hop={hop}
                    x={100 + index * nodeSpacing}
                    y={110}
                    isTarget={hop.hop_is_target}
                    isPrivate={hop.hop_is_private}
                    isTimeout={hop.hop_is_timeout}
                    onClick={() => setSelectedHop(hop)}
                  />
                ))}
              </React.Fragment>
            )}
          </svg>
        </div>
      </div>
      <div className="legend legend--top">
        <div className="legend-item">
          <div className="legend-swatch legend-swatch--regular" />
          <span className="legend-label">Regular Hop</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch legend-swatch--target" />
          <span className="legend-label">Target</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch legend-swatch--private" />
          <span className="legend-label">Private IP</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch legend-swatch--timeout" />
          <span className="legend-label">Timeout</span>
        </div>
      </div>
      <div>
        <h4 className="section-title">Geographic Path</h4>
        <div className="panel panel--map">
          <Map
            center={mapCenter}
            zoom={4}
            className="full-size"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {polylinePositions.length > 1 && (
              <Polyline
                positions={polylinePositions}
                color="#3498db"
                weight={3}
                opacity={0.7}
                dashArray="10, 5"
              />
            )}
            {processedHopsForMap.map((hop) => {
              const isTarget = hop.hop_is_target;
              const isPrivate = hop.hop_is_private;
              const isTimeout = hop.hop_is_timeout;

              let markerColor = '#3498db';
              if (isTarget) markerColor = '#2ecc71';
              if (isPrivate) markerColor = '#9b59b6';
              if (isTimeout) markerColor = '#e74c3c';

              return (
                <Marker
                  key={'marker-' + hop.hopNumber}
                  position={[hop.interpolated_lat, hop.interpolated_lon]}
                  icon={createCustomIcon(markerColor, hop.hopNumber)}
                >
                  <Popup>
                    <div className="map-popup">
                      <strong>Hop {hop.hopNumber}</strong>
                      {!hop.hasValidCoords && (
                        <div className="map-popup-estimated">
                          (Estimated position)
                        </div>
                      )}
                      <hr className="map-popup-divider" />
                      <div>
                        <strong>IP:</strong> {hop.hop_ip}
                      </div>
                      {hop.hop_asn && (
                        <div>
                          <strong>ASN:</strong> {hop.hop_asn}
                        </div>
                      )}
                      {hop.hop_city && (
                        <div>
                          <strong>Location:</strong> {hop.hop_city},{' '}
                          {hop.hop_region}, {hop.hop_country_code}
                        </div>
                      )}
                      <div>
                        <strong>Avg Latency:</strong>{' '}
                        {hop.avg_hop_latency
                          ? hop.avg_hop_latency.toFixed(2)
                          : 'N/A'}{' '}
                        ms
                      </div>
                      <div>
                        <strong>Min/Max:</strong>{' '}
                        {hop.min_hop_latency
                          ? hop.min_hop_latency.toFixed(2)
                          : 'N/A'}{' '}
                        /{' '}
                        {hop.max_hop_latency
                          ? hop.max_hop_latency.toFixed(2)
                          : 'N/A'}{' '}
                        ms
                      </div>
                      <div>
                        <strong>Packet Loss:</strong> {hop.hop_packet_loss}%
                      </div>
                      {hop.hop_is_target && (
                        <div className="map-popup-status map-popup-status--target">
                          <strong>✓ Target</strong>
                        </div>
                      )}
                      {hop.hop_is_private && (
                        <div className="map-popup-status map-popup-status--private">
                          <strong>🔒 Private IP</strong>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </Map>
        </div>
      </div>
      <div className="legend legend--bottom">
        <div className="legend-item">
          <div className="legend-swatch-circle legend-swatch-circle--regular" />
          <span className="legend-label">Regular Hop</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch-circle legend-swatch-circle--target" />
          <span className="legend-label">Target</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch-circle legend-swatch-circle--private" />
          <span className="legend-label">Private IP</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch-circle legend-swatch-circle--timeout" />
          <span className="legend-label">Timeout</span>
        </div>
        <div className="legend-item">
          <span className="legend-note">
            * Estimated positions shown for hops without geolocation
          </span>
        </div>
      </div>
      <Modal hidden={selectedHop === null} onClose={() => setSelectedHop(null)}>
        <HeadingText type={HeadingText.TYPE.HEADING_2}>
          Hop {selectedHop ? selectedHop.hopNumber : ''} Details
        </HeadingText>
        {selectedHop && (
          <div className="modal-content">
            {Object.entries(selectedHop)
              .filter(
                ([key, value]) =>
                  value !== null &&
                  value !== undefined &&
                  key !== 'facet' &&
                  key !== 'hopNumber'
              )
              .map(([key, value]) => (
                <div key={key} className="detail-row">
                  <span className="detail-key">{key}</span>
                  <span className="detail-value">
                    {typeof value === 'boolean'
                      ? value
                        ? 'Yes'
                        : 'No'
                      : typeof value === 'number'
                      ? value.toFixed
                        ? value.toFixed(4)
                        : value
                      : String(value)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </Modal>
      <Modal hidden={!showErrorModal} onClose={() => setShowErrorModal(false)}>
        <HeadingText type={HeadingText.TYPE.HEADING_2}>
          Trace Error Details
        </HeadingText>
        <div className="modal-content">
          <div className="code-block">{traceError || 'Unknown error'}</div>
        </div>
      </Modal>
    </div>
  );
};

export default TraceMap;
