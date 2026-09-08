import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';

const COLUMNS = [
  { id: 'pending', title: 'Pendiente', accent: 'border-t-yellow-400', bg: 'bg-yellow-50/50', count: 0 },
  { id: 'in_progress', title: 'En curso', accent: 'border-t-blue-500', bg: 'bg-blue-50/50', count: 0 },
  { id: 'resolved', title: 'Resuelto', accent: 'border-t-green-500', bg: 'bg-green-50/50', count: 0 },
  { id: 'closed', title: 'Cerrado', accent: 'border-t-slate-400', bg: 'bg-slate-50/50', count: 0 },
];

export default function KanbanBoard({
  incidents,
  getEquipmentName,
  getBuildingName,
  getClientName,
  onDrop,
  onDelete,
}) {
  const grouped = useMemo(() => {
    const map = { pending: [], in_progress: [], resolved: [], closed: [] };
    for (const inc of incidents) {
      if (map[inc.status]) map[inc.status].push(inc);
    }
    return map;
  }, [incidents]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const incidentId = result.draggableId;
    const incident = incidents.find(i => i.id === incidentId);
    if (!incident || incident.status === newStatus) return;
    onDrop(incidentId, newStatus);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
        {COLUMNS.map(col => {
          const items = grouped[col.id] || [];
          return (
            <Droppable droppableId={col.id} key={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 min-w-[260px] max-w-[320px] rounded-xl border border-t-4 ${col.accent} ${col.bg} flex flex-col`}
                >
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200/70">
                    <h3 className="font-semibold text-sm text-slate-700">{col.title}</h3>
                    <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {items.length}
                    </span>
                  </div>
                  <div
                    className={`flex-1 p-2 space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-white/60' : ''}`}
                  >
                    {items.map((inc, idx) => (
                      <Draggable draggableId={inc.id} index={idx} key={inc.id}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={dragProvided.draggableProps.style}
                            className={`transition-shadow ${dragSnapshot.isDragging ? 'shadow-lg rotate-1' : ''}`}
                          >
                            <KanbanCard
                              incident={inc}
                              equipmentName={getEquipmentName(inc.equipment_id)}
                              buildingName={getBuildingName(inc.building_id)}
                              clientName={getClientName(inc.client_id)}
                              onDelete={onDelete}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        Arrastra aquí
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}