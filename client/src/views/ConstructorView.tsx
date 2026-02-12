
import React, { useState, useRef, MouseEvent as ReactMouseEvent, useCallback, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { LayoutElement, TableElement, DecoElement, Floor } from '../types';
import { useApp } from '../context/AppContext';

type DraggableItem = {
    id: string;
    offsetX: number;
    offsetY: number;
};

const ConstructorView: React.FC = () => {
    const { selectedRestaurantId } = useApp();
    const { getRestaurant, updateLayout } = useData();
    const restaurant = selectedRestaurantId ? getRestaurant(selectedRestaurantId) : null;

    const [elements, setElements] = useState<LayoutElement[]>([]);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [activeFloorId, setActiveFloorId] = useState<string>('');
    const [isInitialized, setIsInitialized] = useState(false);

    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const draggableRef = useRef<DraggableItem | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (restaurant && !isInitialized) {
            setElements(restaurant.layout || []);
            const resFloors = restaurant.floors || [{ id: 'floor-1', name: 'Main Floor' }];
            setFloors(resFloors);
            setActiveFloorId(resFloors[0]?.id || '');
            setIsInitialized(true);
        }
    }, [restaurant, isInitialized]);

    const selectedElement = elements.find(el => el.id === selectedElementId);

    const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>, id: string) => {
        e.preventDefault();
        const targetElement = e.currentTarget;
        const rect = targetElement.getBoundingClientRect();

        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        draggableRef.current = { id, offsetX, offsetY };
        setSelectedElementId(id);
    };

    const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
        if (!draggableRef.current || !canvasRef.current) return;

        const { id, offsetX, offsetY } = draggableRef.current;
        const canvasRect = canvasRef.current.getBoundingClientRect();

        let newX = e.clientX - canvasRect.left;
        let newY = e.clientY - canvasRect.top;

        setElements(prev => prev.map(el => {
            if (el.id !== id) return el;
            const pivotX = el.type === 'table' ? (el.shape === 'circle' ? 24 : 28) : (el as DecoElement).width / 2;
            const pivotY = el.type === 'table' ? (el.shape === 'circle' ? 24 : 28) : (el as DecoElement).height / 2;
            return { ...el, x: newX - offsetX + pivotX, y: newY - offsetY + pivotY };
        }));
    }, []);

    const handleMouseUp = useCallback(() => {
        draggableRef.current = null;
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const addElement = (type: 'table-square' | 'table-circle' | 'wall' | 'bar' | 'plant' | 'window') => {
        const newId = `el-${Date.now()}`;
        let newElement: LayoutElement;

        if (type === 'table-square' || type === 'table-circle') {
            const tableCount = elements.filter(e => e.type === 'table').length;
            newElement = {
                id: newId,
                type: 'table',
                x: 100, y: 100,
                seats: 4,
                shape: type === 'table-square' ? 'square' : 'circle',
                label: (tableCount + 1).toString(),
                floorId: activeFloorId
            } as TableElement;
        } else {
            newElement = {
                id: newId,
                type: type,
                x: 100, y: 100,
                width: type === 'wall' || type === 'window' ? 100 : (type === 'bar' ? 150 : 40),
                height: type === 'wall' || type === 'window' ? 10 : (type === 'bar' ? 50 : 40),
                floorId: activeFloorId
            } as DecoElement;
        }
        setElements(prev => [...prev, newElement]);
    };

    const updateSelectedElement = (prop: string, value: any) => {
        if (!selectedElementId) return;
        setElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, [prop]: value } : el));
    };

    const deleteSelectedElement = () => {
        if (!selectedElementId) return;
        setElements(prev => prev.filter(el => el.id !== selectedElementId));
        setSelectedElementId(null);
    };

    const addFloor = () => {
        const name = prompt('Floor Name:', `Floor ${floors.length + 1}`);
        if (name) {
            const newFloor = { id: `floor-${Date.now()}`, name };
            setFloors(prev => [...prev, newFloor]);
            setActiveFloorId(newFloor.id);
        }
    };

    const handleSaveLayout = () => {
        if (!selectedRestaurantId) return;
        updateLayout(selectedRestaurantId, elements, floors);
        alert('Layout saved!');
    };

    if (!restaurant) {
        return <div className="text-center text-gray-400">Loading restaurant data...</div>;
    }

    const currentFloorElements = elements.filter(el => el.floorId === activeFloorId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 bg-brand-primary p-4 rounded-lg shadow-lg flex flex-col">
                <h3 className="font-bold text-xl mb-4">Toolbox</h3>
                <div className="grid grid-cols-2 gap-2 mb-6">
                    <button onClick={() => addElement('table-square')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600 transition-colors">Square Table</button>
                    <button onClick={() => addElement('table-circle')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600 transition-colors">Circle Table</button>
                    <button onClick={() => addElement('wall')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600 transition-colors">Wall</button>
                    <button onClick={() => addElement('window')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600 transition-colors">Window</button>
                    <button onClick={() => addElement('bar')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600 transition-colors">Bar</button>
                    <button onClick={() => addElement('plant')} className="bg-brand-accent p-3 rounded text-sm hover:bg-gray-600 transition-colors">Plant</button>
                </div>

                <div className="flex-grow">
                    {selectedElement && (
                        <div className="border-t border-brand-accent pt-4 animate-fade-in">
                            <h4 className="font-bold text-lg mb-2">Properties</h4>
                            <div className="space-y-3 text-sm">
                                {selectedElement.type === 'table' && (
                                    <>
                                        <div><label className="text-gray-400">Label</label><input type="text" value={(selectedElement as TableElement).label} onChange={e => updateSelectedElement('label', e.target.value)} className="w-full bg-brand-secondary p-2 rounded mt-1 border border-gray-600" /></div>
                                        <div><label className="text-gray-400">Seats</label><input type="number" value={(selectedElement as TableElement).seats} onChange={e => updateSelectedElement('seats', parseInt(e.target.value))} className="w-full bg-brand-secondary p-2 rounded mt-1 border border-gray-600" /></div>
                                    </>
                                )}
                                {'width' in selectedElement && <div><label className="text-gray-400">Width</label><input type="number" value={(selectedElement as DecoElement).width} onChange={e => updateSelectedElement('width', parseInt(e.target.value))} className="w-full bg-brand-secondary p-2 rounded mt-1 border border-gray-600" /></div>}
                                {'height' in selectedElement && <div><label className="text-gray-400">Height</label><input type="number" value={(selectedElement as DecoElement).height} onChange={e => updateSelectedElement('height', parseInt(e.target.value))} className="w-full bg-brand-secondary p-2 rounded mt-1 border border-gray-600" /></div>}

                                <button onClick={deleteSelectedElement} className="w-full bg-brand-red/20 text-brand-red border border-brand-red/50 py-2 rounded-md hover:bg-brand-red hover:text-white transition-all mt-4 font-semibold uppercase text-xs tracking-wider">Delete Element</button>
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={handleSaveLayout} className="w-full bg-brand-blue text-white font-bold py-3 mt-8 rounded-lg hover:bg-blue-600 transition-colors shadow-lg">Save Layout</button>
            </div>

            <div className="lg:col-span-3">
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Layout Constructor for {restaurant.name}</h2>
                        <div className="flex items-center space-x-2 bg-brand-secondary p-1 rounded-md border border-brand-accent">
                            {floors.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFloorId(f.id)}
                                    className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${activeFloorId === f.id ? 'bg-brand-blue text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {f.name}
                                </button>
                            ))}
                            <button onClick={addFloor} className="px-3 py-1.5 rounded text-sm font-medium text-brand-blue hover:bg-brand-blue/10 transition-colors">+</button>
                        </div>
                    </div>

                    <div ref={canvasRef} className="w-full h-[600px] bg-brand-primary rounded-lg relative overflow-hidden border-2 border-brand-accent bg-grid">
                        {currentFloorElements.map(el => {
                            const isSelected = el.id === selectedElementId;
                            const baseStyles = {
                                left: `${el.x}px`, top: `${el.y}px`,
                                zIndex: isSelected ? 10 : 1,
                                outline: isSelected ? '2px solid #3b82f6' : 'none',
                                outlineOffset: '2px'
                            };

                            if (el.type === 'table') {
                                const shapeClasses = el.shape === 'circle' ? 'rounded-full w-12 h-12' : 'rounded-md w-14 h-14';
                                return <div key={el.id} style={baseStyles} onMouseDown={(e) => handleMouseDown(e, el.id)} className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-white bg-gray-500 cursor-move shadow-md ${shapeClasses}`}>
                                    {(el as TableElement).label}
                                </div>
                            } else {
                                const decoStyles: { [key: string]: string } = {
                                    wall: 'bg-gray-600',
                                    bar: 'bg-yellow-800 border-b-4 border-yellow-900',
                                    plant: 'bg-emerald-900 border-2 border-green-500 rounded-full',
                                    window: 'bg-sky-200/40 border-2 border-sky-300'
                                };
                                return (
                                    <div
                                        key={el.id}
                                        onMouseDown={(e) => handleMouseDown(e, el.id)}
                                        style={{ ...baseStyles, width: `${(el as DecoElement).width}px`, height: `${(el as DecoElement).height}px` }}
                                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move shadow-sm ${decoStyles[el.type]}`}
                                    >
                                        {el.type === 'window' && <div className="w-full h-full flex items-center justify-center"><div className="w-0.5 h-full bg-sky-300/50"></div></div>}
                                    </div>
                                );
                            }
                        })}
                    </div>
                </div>
            </div>

            <style>{`
                .bg-grid {
                    background-image: linear-gradient(to right, #2d3748 1px, transparent 1px), linear-gradient(to bottom, #2d3748 1px, transparent 1px);
                    background-size: 40px 40px;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ConstructorView;
