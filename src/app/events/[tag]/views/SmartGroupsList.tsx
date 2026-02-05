import React from "react";
import { Plus, Filter, Layers, ChevronRight, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Group {
    id: string;
    name: string;
    rule: string;
    count: number;
    color: string;
    type: string;
    options?: any[];
}

interface SmartGroupsListProps {
    groups: Group[];
    onOpenCreateModal: () => void;
    onSelectGroup: (group: Group) => void;
    onEditGroup: (group: Group) => void;
    onDeleteGroup: (e: React.MouseEvent, id: string) => void;
}

export function SmartGroupsList({
    groups,
    onOpenCreateModal,
    onSelectGroup,
    onEditGroup,
    onDeleteGroup
}: SmartGroupsListProps) {
    return (
        <>
            <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-gray-900">Guest Segment Definitions</h2>
                    <p className="text-sm text-gray-400 mt-1.5 font-bold">Find guests instantly based on their variables and metadata.</p>
                </div>
                <button
                    onClick={onOpenCreateModal}
                    className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-gray-100 active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Create Group
                </button>
            </header>

            <div className="grid grid-cols-1 gap-4">
                {groups.map((group) => (
                    <div
                        key={group.id}
                        onClick={() => onSelectGroup(group)}
                        className="p-7 border border-gray-100 rounded-3xl bg-white hover:border-[var(--brand-blue)]/40 transition-all group shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden"
                    >
                        {group.type === "auto-segment" && (
                            <div className="absolute top-0 right-10 bg-[var(--brand-blue)] text-white text-[7px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-b-lg shadow-sm">
                                Auto-Generated
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                                    group.color
                                )}>
                                    <Filter className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight">{group.name}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                            <Layers className="w-3 h-3" /> {group.rule}
                                        </p>
                                        {group.type === "automation" && (
                                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded">Logic Driven</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="text-xl font-black text-gray-900 tracking-tighter">{group.count}</div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Guests</div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Edit/Action Buttons */}
                                    {group.type !== 'breakdown' && (
                                        <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditGroup(group);
                                                }}
                                                title="Edit segment"
                                                className="p-1.5 text-gray-300 hover:text-gray-900 transition-colors"
                                            >
                                                <Settings className="w-3.5 h-3.5" />
                                            </button>
                                            <div className="w-px h-3.5 bg-gray-200" />
                                            <button
                                                onClick={(e) => onDeleteGroup(e, group.id)}
                                                title="Delete segment"
                                                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="p-2 text-gray-300 group-hover:text-gray-900 transition-colors">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
