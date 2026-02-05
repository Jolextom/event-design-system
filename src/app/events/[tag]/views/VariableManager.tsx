import React from "react";
import { Plus, Tag, Trash2, Sparkles } from "lucide-react";
import type { EventVariable } from "../types";

interface VariableManagerProps {
    variables: EventVariable[];
    onOpenCreateModal: () => void;
    onEditVariable: (variable: EventVariable) => void;
    onDeleteVariable: (e: React.MouseEvent, id: string) => void;
}

export function VariableManager({
    variables,
    onOpenCreateModal,
    onEditVariable,
    onDeleteVariable
}: VariableManagerProps) {
    return (
        <div className="pt-8 border-t border-gray-100">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-gray-900">Custom Variables</h2>
                    <p className="text-sm text-gray-400 mt-1 font-bold">Define data fields for assignments (e.g. Teams, Table Numbers).</p>
                </div>
                <button
                    onClick={onOpenCreateModal}
                    className="flex items-center gap-2 bg-purple-50 text-purple-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all border border-purple-100"
                >
                    <Plus className="w-3.5 h-3.5" /> Define Variable
                </button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {variables.map((v) => (
                    <div
                        key={v.id}
                        onClick={() => onEditVariable(v)}
                        className="group p-5 bg-white border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-md transition-all cursor-pointer relative"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="bg-purple-50 p-2 rounded-lg text-purple-600 group-hover:bg-purple-100 transition-colors">
                                <Tag className="w-4 h-4" />
                            </div>
                            <button
                                onClick={(e) => onDeleteVariable(e, v.id)}
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <h3 className="text-sm font-black text-gray-900">{v.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                {v.type}
                            </span>
                            {v.type === 'select' && (
                                <span className="text-[9px] font-bold text-gray-400">
                                    {v.options?.length || 0} options
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {variables.length === 0 && (
                    <div onClick={onOpenCreateModal} className="col-span-full p-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-200 hover:bg-purple-50/30 transition-all gap-3 group">
                        <div className="p-3 bg-gray-50 rounded-full text-gray-300 group-hover:text-purple-400 transition-colors">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">No Custom Variables</p>
                            <p className="text-xs text-gray-400 mt-1">Create a variable to start assigning properties to guests.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
