/**
 * ElementCard — one blueprint element.
 *
 * Draggable: dropping it in another cell reassigns its stage and lane. It never
 * carries x/y coordinates, so nothing here talks about pixels.
 */

import React from 'react';
import { EMOTIONS, MARKERS } from '../model/constants.js';
import { color, font, radius, tintFor } from '../theme.js';

export function ElementCard({
  element,
  lane,
  system,
  selected,
  neighbour,
  dimmed,
  dragging,
  connecting,
  isConnectSource,
  showMetadata,
  imageSlot,
  onSelect,
  onStartConnect,
  onDragStart,
  onDragEnd,
  onDragOver,
  cardRef,
}) {
  const tint = tintFor(lane.kind);
  const isEvidence = lane.kind === 'evidence';
  const marker = MARKERS[element.marker];
  const emotion = EMOTIONS[element.emotion];

  const boxShadow = isConnectSource
    ? `0 0 0 2.5px ${color.accent}`
    : selected
      ? `0 0 0 2px ${color.accent}33, 0 2px 6px rgba(22,32,42,0.10)`
      : neighbour
        ? `0 0 0 1.5px ${color.blue}55`
        : '0 1px 2px rgba(22,32,42,0.05)';

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      style={{
        position: 'relative',
        zIndex: 10,
        background: tint.fill,
        border: `1px ${isEvidence ? 'dashed' : 'solid'} ${selected || isConnectSource ? color.accent : tint.border}`,
        borderRadius: isEvidence ? 5 : radius.lg,
        padding: isEvidence ? '6px 9px' : '9px 10px',
        fontSize: isEvidence ? 11 : 12.5,
        color: tint.ink,
        cursor: connecting ? 'crosshair' : 'grab',
        boxShadow,
        opacity: dragging ? 0.35 : dimmed ? 0.18 : 1,
        transition: 'opacity .15s, box-shadow .15s',
        userSelect: 'none',
      }}
    >
      {imageSlot}

      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.32 }}>{element.label}</div>

        {emotion && (
          <div
            title={`Employee emotion: ${emotion.label}`}
            style={{
              width: 13,
              height: 13,
              flex: 'none',
              borderRadius: '50%',
              border: `1px solid ${emotion.color}66`,
              background: `${emotion.color}1A`,
              color: emotion.color,
              fontSize: 9,
              fontWeight: 600,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {emotion.glyph}
          </div>
        )}

        {marker && (
          <div
            title={marker.label}
            style={{
              width: 7,
              height: 7,
              flex: 'none',
              marginTop: 4,
              borderRadius: '50%',
              background: marker.color,
            }}
          />
        )}
      </div>

      {showMetadata && !isEvidence && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            alignItems: 'center',
            marginTop: 7,
            paddingTop: 6,
            borderTop: '1px solid rgba(22, 32, 42, 0.08)',
          }}
        >
          <span style={{ fontFamily: font.mono, fontSize: 9, color: 'rgba(22, 32, 42, 0.5)' }}>
            {element.id}
          </span>
          {element.system && (
            <span
              style={{
                fontFamily: font.mono,
                fontSize: 9,
                padding: '1px 4px',
                borderRadius: 3,
                background: 'rgba(22, 32, 42, 0.07)',
              }}
            >
              {system?.name || element.system}
            </span>
          )}
          <span
            style={{
              fontFamily: font.mono,
              fontSize: 9,
              padding: '1px 4px',
              borderRadius: 3,
              background: element.status === 'implemented' ? `${color.green}22` : 'transparent',
              color: element.status ? 'rgba(22,32,42,0.62)' : 'rgba(22,32,42,0.32)',
            }}
          >
            {element.status || 'no status'}
          </span>
        </div>
      )}

      {element.note && (
        <div
          style={{
            marginTop: 6,
            padding: '5px 7px',
            borderRadius: radius.sm,
            background: color.note,
            color: color.noteInk,
            fontSize: 10.5,
            lineHeight: 1.35,
          }}
        >
          {element.note}
        </div>
      )}

      <button
        type="button"
        title="Draw a connection"
        onClick={(event) => {
          event.stopPropagation();
          onStartConnect();
        }}
        style={{
          position: 'absolute',
          right: -8,
          top: '50%',
          marginTop: -8,
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: `1px solid ${connecting ? color.accent : '#B7C2CA'}`,
          background: color.panel,
          color: connecting ? color.accent : color.muted,
          fontSize: 9,
          lineHeight: 1,
          cursor: 'crosshair',
          opacity: connecting ? 1 : 0.45,
          zIndex: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        ⤳
      </button>
    </div>
  );
}
