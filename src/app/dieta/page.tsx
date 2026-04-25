"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Utensils, Flame, Plus, Trash2, X, CheckCircle2, Circle, Loader2, FileJson, ShoppingCart, FileDown, Pill, Edit2, Save, ArrowUpDown } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface Food {
    id: string;
    name: string;
    quantity?: string;
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
    checked?: boolean;
}

interface Supplement {
    id: string;
    name: string;
    quantity: string;
    time: string;
    checked?: boolean;
}

interface Meal {
    id: string;
    name: string;
    time: string;
    checked?: boolean;
    foods: Food[];
}

interface QuantityAdjustmentModalState {
    mealId: string;
    foodId: string;
    foodName: string;
    originalQuantity: string;
    originalAmount: number;
    newAmount: string;
}

export default function Dieta() {
    const { user } = useAuth();
    const [meals, setMeals] = useState<Meal[]>([]);
    const [supplements, setSupplements] = useState<Supplement[]>([]);
    const [loading, setLoading] = useState(true);

    const [newMealName, setNewMealName] = useState("");
    const [newMealTime, setNewMealTime] = useState("");

    const [activeMealId, setActiveMealId] = useState<string | null>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
    const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
    const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [isQuantityAdjustModalOpen, setIsQuantityAdjustModalOpen] = useState(false);
    const [jsonInput, setJsonInput] = useState("");
    const [selectedPdfMealIds, setSelectedPdfMealIds] = useState<string[]>([]);
    const [includeSupplementsInPdf, setIncludeSupplementsInPdf] = useState(true);
    const [quantityAdjustment, setQuantityAdjustment] = useState<QuantityAdjustmentModalState | null>(null);

    const [newFood, setNewFood] = useState({
        name: "",
        quantity: "",
        protein: "",
        carbs: "",
        fats: "",
        calories: ""
    });

    const [editingMealId, setEditingMealId] = useState<string | null>(null);
    const [editedMealName, setEditedMealName] = useState("");
    const [editedMealTime, setEditedMealTime] = useState("");

    const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
    const [editedFood, setEditedFood] = useState({
        name: "",
        quantity: "",
        protein: "",
        carbs: "",
        fats: "",
        calories: ""
    });

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchDiet = async () => {
            try {
                const docRef = doc(db, "users", user.uid, "diet", "plan");
                const docSnap = await getDoc(docRef);
                const today = new Date().toISOString().split('T')[0];

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    let loadedMeals: Meal[] = data.meals || [];

                    // Reseta os checks se for um novo dia
                    if (data.lastResetDate !== today) {
                        loadedMeals = loadedMeals.map(m => ({
                            ...m,
                            checked: false,
                            foods: m.foods.map(f => ({ ...f, checked: false }))
                        }));
                        await setDoc(docRef, { meals: loadedMeals, lastResetDate: today }, { merge: true });
                    }
                    setMeals(loadedMeals);
                }
            } catch (error) {
                console.error("Erro ao carregar dieta:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchSupplements = async () => {
            try {
                const docRef = doc(db, "users", user.uid, "supplements", "plan");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSupplements(docSnap.data().items || []);
                }
            } catch (error) {
                console.error("Erro ao carregar suplementos:", error);
            }
        };

        fetchDiet();
        fetchSupplements();
    }, [user]);

    const saveDietToFirebase = async (updatedMeals: Meal[]) => {
        if (!user) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const docRef = doc(db, "users", user.uid, "diet", "plan");
            await setDoc(docRef, { meals: updatedMeals, lastResetDate: today }, { merge: true });
        } catch (error) {
            console.error("Erro ao salvar dieta:", error);
        }
    };

    const addMeal = () => {
        if (!newMealName.trim() || !newMealTime.trim()) return;
        const newMeal: Meal = {
            id: Date.now().toString(),
            name: newMealName,
            time: newMealTime,
            checked: false,
            foods: []
        };
        const updatedMeals = [...meals, newMeal].sort((a, b) => a.time.localeCompare(b.time));
        setMeals(updatedMeals);
        saveDietToFirebase(updatedMeals);
        setNewMealName("");
        setNewMealTime("");
        if (!activeMealId) setActiveMealId(newMeal.id);
    };

    const removeMeal = (id: string) => {
        const updatedMeals = meals.filter(m => m.id !== id);
        setMeals(updatedMeals);
        saveDietToFirebase(updatedMeals);
        if (activeMealId === id) setActiveMealId(null);
    };

    const toggleMealCheck = (id: string) => {
        const updatedMeals = meals.map(m => m.id === id ? { ...m, checked: !m.checked } : m);
        setMeals(updatedMeals);
        saveDietToFirebase(updatedMeals);
    };

    const toggleFoodCheck = (mealId: string, foodId: string) => {
        const updatedMeals = meals.map(m => {
            if (m.id === mealId) {
                return {
                    ...m,
                    foods: m.foods.map(f => f.id === foodId ? { ...f, checked: !f.checked } : f)
                };
            }
            return m;
        });
        setMeals(updatedMeals);
        saveDietToFirebase(updatedMeals);
    };

    const addFood = (mealId: string) => {
        if (!newFood.name.trim()) return;

        // Convertendo strings para float (permite 1.5, 2.7, etc)
        const updatedMeals = meals.map(m => {
            if (m.id === mealId) {
                return {
                    ...m,
                    foods: [...m.foods, {
                        id: Date.now().toString(),
                        name: newFood.name,
                        quantity: newFood.quantity.trim() || undefined,
                        protein: parseFloat(newFood.protein) || 0,
                        carbs: parseFloat(newFood.carbs) || 0,
                        fats: parseFloat(newFood.fats) || 0,
                        calories: parseFloat(newFood.calories) || 0,
                        checked: false
                    }]
                };
            }
            return m;
        });

        setMeals(updatedMeals);
        saveDietToFirebase(updatedMeals);
        setNewFood({ name: "", quantity: "", protein: "", carbs: "", fats: "", calories: "" });
        setIsFoodModalOpen(false);
    };

    const removeFood = (mealId: string, foodId: string) => {
        const updatedMeals = meals.map(m => {
            if (m.id === mealId) {
                return {
                    ...m,
                    foods: m.foods.filter(f => f.id !== foodId)
                };
            }
            return m;
        });
        setMeals(updatedMeals);
        saveDietToFirebase(updatedMeals);
    };

    const startEditMeal = (meal: Meal) => {
        setEditingMealId(meal.id);
        setEditedMealName(meal.name);
        setEditedMealTime(meal.time);
    };

    const saveEditMeal = (id: string) => {
        if (!editedMealName.trim() || !editedMealTime.trim()) return;
        const updatedMeals = meals.map(m =>
            m.id === id ? { ...m, name: editedMealName, time: editedMealTime } : m
        ).sort((a, b) => a.time.localeCompare(b.time));
        setMeals(updatedMeals);
        saveDietToFirebase(updatedMeals);
        setEditingMealId(null);
    };

    const cancelEditMeal = () => {
        setEditingMealId(null);
    };

    const startEditFood = (food: Food) => {
        setEditingFoodId(food.id);
        setEditedFood({
            name: food.name,
            quantity: food.quantity || "",
            protein: food.protein.toString(),
            carbs: food.carbs.toString(),
            fats: food.fats.toString(),
            calories: food.calories.toString()
        });
    };

    const saveEditFood = (mealId: string, foodId: string) => {
        if (!editedFood.name.trim()) return;
        const updatedMeals = meals.map(m => {
            if (m.id === mealId) {
                return {
                    ...m,
                    foods: m.foods.map(f => f.id === foodId ? {
                        ...f,
                        name: editedFood.name,
                        quantity: editedFood.quantity.trim() || undefined,
                        protein: parseFloat(editedFood.protein) || 0,
                        carbs: parseFloat(editedFood.carbs) || 0,
                        fats: parseFloat(editedFood.fats) || 0,
                        calories: parseFloat(editedFood.calories) || 0,
                    } : f)
                };
            }
            return m;
        });
        setMeals(updatedMeals);
        saveDietToFirebase(updatedMeals);
        setEditingFoodId(null);
    };

    const cancelEditFood = () => {
        setEditingFoodId(null);
    };

    const parseNumericValue = (value: string) => {
        const normalized = value.replace(",", ".").trim();
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : NaN;
    };

    const formatDecimal = (value: number, maxFractionDigits = 2) => {
        if (Number.isInteger(value)) return value.toString();

        return value.toLocaleString("pt-BR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: maxFractionDigits
        });
    };

    const roundMacroValue = (value: number) => Number(value.toFixed(2));

    const extractQuantityNumber = (quantity?: string) => {
        if (!quantity) return null;

        const match = quantity.match(/(\d+(?:[.,]\d+)?)/);
        if (!match || match.index === undefined) return null;

        const parsedValue = parseNumericValue(match[0]);
        if (!Number.isFinite(parsedValue)) return null;

        return {
            value: parsedValue,
            start: match.index,
            end: match.index + match[0].length
        };
    };

    const replaceQuantityNumber = (quantity: string, newValue: number) => {
        const extracted = extractQuantityNumber(quantity);
        if (!extracted) return quantity;

        return `${quantity.slice(0, extracted.start)}${formatDecimal(newValue)}${quantity.slice(extracted.end)}`;
    };

    const openPDFModal = () => {
        setSelectedPdfMealIds(meals.map(meal => meal.id));
        setIncludeSupplementsInPdf(true);
        setIsPdfModalOpen(true);
    };

    const togglePdfMealSelection = (mealId: string) => {
        setSelectedPdfMealIds(current =>
            current.includes(mealId)
                ? current.filter(id => id !== mealId)
                : [...current, mealId]
        );
    };

    const openQuantityAdjustModal = (mealId: string, food: Food) => {
        const extracted = extractQuantityNumber(food.quantity);

        if (!food.quantity || !extracted) {
            alert("Nao foi possivel identificar uma quantidade numerica para este alimento.");
            return;
        }

        if (extracted.value <= 0) {
            alert("A quantidade original precisa ser maior que zero para recalcular proporcionalmente.");
            return;
        }

        setQuantityAdjustment({
            mealId,
            foodId: food.id,
            foodName: food.name,
            originalQuantity: food.quantity,
            originalAmount: extracted.value,
            newAmount: formatDecimal(extracted.value)
        });
        setIsQuantityAdjustModalOpen(true);
    };

    const closeQuantityAdjustModal = () => {
        setIsQuantityAdjustModalOpen(false);
        setQuantityAdjustment(null);
    };

    const saveAdjustedFoodQuantity = () => {
        if (!quantityAdjustment) return;

        const parsedNewAmount = parseNumericValue(quantityAdjustment.newAmount);
        if (!Number.isFinite(parsedNewAmount) || parsedNewAmount <= 0) {
            alert("Informe uma nova quantidade valida.");
            return;
        }

        const proportion = parsedNewAmount / quantityAdjustment.originalAmount;
        const updatedMeals = meals.map(meal => {
            if (meal.id !== quantityAdjustment.mealId) return meal;

            return {
                ...meal,
                foods: meal.foods.map(food => {
                    if (food.id !== quantityAdjustment.foodId) return food;

                    return {
                        ...food,
                        quantity: replaceQuantityNumber(quantityAdjustment.originalQuantity, parsedNewAmount),
                        protein: roundMacroValue(food.protein * proportion),
                        carbs: roundMacroValue(food.carbs * proportion),
                        fats: roundMacroValue(food.fats * proportion),
                        calories: roundMacroValue(food.calories * proportion)
                    };
                })
            };
        });

        setMeals(updatedMeals);
        saveDietToFirebase(updatedMeals);
        closeQuantityAdjustModal();
    };

    const importDietFromJson = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (!Array.isArray(parsed)) {
                alert("O JSON deve ser um array de refeições.");
                return;
            }

            const importedMeals: Meal[] = parsed.map((m: any, i: number) => ({
                id: m.id || Date.now().toString() + i,
                name: m.name || `Refeição ${i + 1}`,
                time: m.time || "00:00",
                checked: false,
                foods: Array.isArray(m.foods) ? m.foods.map((f: any, j: number) => ({
                    id: f.id || Date.now().toString() + i + j,
                    name: f.name || "Alimento",
                    quantity: f.quantity?.toString() || undefined,
                    protein: Number(f.protein) || 0,
                    carbs: Number(f.carbs) || 0,
                    fats: Number(f.fats) || 0,
                    calories: Number(f.calories) || 0,
                    checked: f.checked || false
                })) : []
            }));

            // Organiza do menor horário para o maior
            importedMeals.sort((a, b) => a.time.localeCompare(b.time));

            setMeals(importedMeals);
            saveDietToFirebase(importedMeals);
            setJsonInput("");
            setIsJsonModalOpen(false);
            if (importedMeals.length > 0) setActiveMealId(importedMeals[0].id);

        } catch (error) {
            alert("JSON inválido. Verifique a sintaxe.");
            console.error(error);
        }
    };

    const generatePDF = async () => {
        if (selectedPdfMealIds.length === 0 && (!includeSupplementsInPdf || supplements.length === 0)) {
            alert("Selecione pelo menos uma refeicao ou inclua a suplementacao no PDF.");
            return;
        }

        setIsGeneratingPDF(true);
        setIsPdfModalOpen(false);
        try {
            const element = document.getElementById("pdf-content");
            if (!element) return;

            element.style.display = "block";
            element.style.position = "absolute";
            element.style.left = "-9999px";
            element.style.top = "-9999px";

            await new Promise(resolve => requestAnimationFrame(() => resolve(null)));

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#f4f2ea"
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Plano_Alimentar_Haumea_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Não foi possível gerar o PDF da dieta.");
        } finally {
            const element = document.getElementById("pdf-content");
            if (element) {
                element.style.display = "none";
            }
            setIsGeneratingPDF(false);
        }
    };

    const activeMeal = meals.find(m => m.id === activeMealId);

    const totalMacros = meals.reduce((acc, meal) => {
        meal.foods.forEach(f => {
            acc.protein += f.protein;
            acc.carbs += f.carbs;
            acc.fats += f.fats;
            acc.calories += f.calories;
        });
        return acc;
    }, { protein: 0, carbs: 0, fats: 0, calories: 0 });

    const selectedPdfMeals = meals.filter(meal => selectedPdfMealIds.includes(meal.id));
    const pdfTotals = selectedPdfMeals.reduce((acc, meal) => {
        meal.foods.forEach(food => {
            acc.protein += food.protein;
            acc.carbs += food.carbs;
            acc.fats += food.fats;
            acc.calories += food.calories;
        });
        return acc;
    }, { protein: 0, carbs: 0, fats: 0, calories: 0 });
    const pdfSupplements = includeSupplementsInPdf
        ? [...supplements].sort((a, b) => a.time.localeCompare(b.time))
        : [];
    const allPdfMealsSelected = meals.length > 0 && selectedPdfMealIds.length === meals.length;
    const canGeneratePdf = selectedPdfMeals.length > 0 || pdfSupplements.length > 0;
    const adjustingFood = quantityAdjustment
        ? meals.find(meal => meal.id === quantityAdjustment.mealId)?.foods.find(food => food.id === quantityAdjustment.foodId) || null
        : null;
    const adjustedAmountPreview = quantityAdjustment ? parseNumericValue(quantityAdjustment.newAmount) : NaN;
    const adjustedProportionPreview = quantityAdjustment && Number.isFinite(adjustedAmountPreview) && quantityAdjustment.originalAmount > 0
        ? adjustedAmountPreview / quantityAdjustment.originalAmount
        : null;

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto px-12 pt-12 flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#1a1a1c]" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 pb-24 pt-8 md:pt-12 relative">
            <Header
                title="Plano Nutricional"
                subtitle="Construa sua dieta sob medida"
            />

            {/* Global Macros Overview */}
            <section className="bg-white border border-[#f2eee3] rounded-3xl p-6 md:p-8 mb-8 md:mb-10 shadow-sm relative overflow-hidden flex flex-wrap gap-6 md:gap-8 justify-between items-center">
                <div className="relative z-10 flex-1 min-w-[200px]">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#a19e95] flex items-center gap-2 mb-2">
                        <Flame className="w-3 h-3 text-[#d84a22]" /> Total Consumo
                    </span>
                    <div className="flex items-baseline gap-2">
                        <h3 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-[#1a1a1c]">
                            {Number.isInteger(totalMacros.calories) ? totalMacros.calories : totalMacros.calories.toFixed(2)}
                        </h3>
                        <span className="text-sm font-medium text-[#88888b]">KCAL</span>
                    </div>
                </div>

                <div className="flex gap-6 md:gap-10 relative z-10 flex-wrap w-full md:w-auto">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1">Proteínas</span>
                        <span className="font-mono-data text-xl md:text-2xl font-bold text-[#1a1a1c]">
                            {Number.isInteger(totalMacros.protein) ? totalMacros.protein : totalMacros.protein.toFixed(2)}g
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1">Carboidratos</span>
                        <span className="font-mono-data text-xl md:text-2xl font-bold text-[#1a1a1c]">
                            {Number.isInteger(totalMacros.carbs) ? totalMacros.carbs : totalMacros.carbs.toFixed(2)}g
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1">Gorduras</span>
                        <span className="font-mono-data text-xl md:text-2xl font-bold text-[#1a1a1c]">
                            {Number.isInteger(totalMacros.fats) ? totalMacros.fats : totalMacros.fats.toFixed(2)}g
                        </span>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                {/* Left Column - Meals List */}
                <div className="xl:col-span-1 space-y-6 md:space-y-8">
                    <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#f2eee3] shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-heading text-lg font-bold text-[#1a1a1c]">Criar Refeição</h4>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsShoppingListOpen(true)}
                                    className="flex items-center gap-2 text-[#a19e95] hover:text-[#1a1a1c] transition-colors text-[10px] font-bold uppercase tracking-widest"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    Lista
                                </button>
                                <button
                                    onClick={() => setIsJsonModalOpen(true)}
                                    className="flex items-center gap-2 text-[#a19e95] hover:text-[#1a1a1c] transition-colors text-[10px] font-bold uppercase tracking-widest"
                                >
                                    <FileJson className="w-4 h-4" />
                                    JSON
                                </button>
                                <button
                                    onClick={openPDFModal}
                                    disabled={isGeneratingPDF || (meals.length === 0 && supplements.length === 0)}
                                    className="flex items-center gap-2 text-[#a19e95] hover:text-[#1a1a1c] transition-colors text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                >
                                    {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                    PDF
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                value={newMealName}
                                onChange={(e) => setNewMealName(e.target.value)}
                                placeholder="Nome (Ex: Almoço)"
                                className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:ring-1 focus:ring-[#1a1a1c] outline-none text-sm transition-shadow"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="time"
                                    value={newMealTime}
                                    onChange={(e) => setNewMealTime(e.target.value)}
                                    className="flex-1 bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:ring-1 focus:ring-[#1a1a1c] outline-none text-sm transition-shadow"
                                />
                                <button
                                    onClick={addMeal}
                                    className="bg-white border border-[#e6e2d6] text-[#1a1a1c] px-4 py-3 rounded-xl hover:bg-[#f4f2ea] transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            {meals.length === 0 ? (
                                <p className="text-xs text-[#a19e95] font-mono-data uppercase tracking-widest text-center py-4">
                                    Nenhuma refeição criada
                                </p>
                            ) : (
                                meals.map(meal => {
                                    const mealKcal = meal.foods.reduce((sum, f) => sum + f.calories, 0);
                                    return (
                                        <div
                                            key={meal.id}
                                            onClick={() => setActiveMealId(meal.id)}
                                            className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-center transition-all ${activeMealId === meal.id
                                                ? "bg-[#f4f2ea] text-[#1a1a1c] border-[#1a1a1c]"
                                                : "bg-white text-[#1a1a1c] border-[#e6e2d6] hover:border-[#1a1a1c]"
                                                }`}
                                        >
                                            {editingMealId === meal.id ? (
                                                <div className="flex flex-col gap-2 w-full" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        value={editedMealName}
                                                        onChange={(e) => setEditedMealName(e.target.value)}
                                                        className="w-full bg-white border border-[#e6e2d6] rounded-lg px-3 py-2 text-sm text-[#1a1a1c] outline-none"
                                                    />
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="time"
                                                            value={editedMealTime}
                                                            onChange={(e) => setEditedMealTime(e.target.value)}
                                                            className="flex-1 bg-white border border-[#e6e2d6] rounded-lg px-3 py-2 text-sm text-[#1a1a1c] outline-none"
                                                        />
                                                        <button onClick={() => saveEditMeal(meal.id)} className="bg-[#1a1a1c] text-white p-2 rounded-lg">
                                                            <Save className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={cancelEditMeal} className="bg-white border border-[#e6e2d6] text-[#1a1a1c] p-2 rounded-lg">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center w-full">
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleMealCheck(meal.id);
                                                            }}
                                                            className={`hover:scale-110 transition-transform ${meal.checked ? 'text-green-600' : 'text-[#a19e95]'}`}
                                                            title={meal.checked ? "Desmarcar refeição" : "Marcar como concluída"}
                                                        >
                                                            {meal.checked ? <CheckCircle2 className="w-5 h-5 fill-green-100" /> : <Circle className="w-5 h-5" />}
                                                        </button>
                                                        <div>
                                                            <span className={`font-bold text-sm block transition-all ${meal.checked ? 'line-through opacity-40' : ''}`}>
                                                                {meal.name}
                                                            </span>
                                                            <div className={`flex gap-3 text-[10px] font-mono-data tracking-widest mt-1 opacity-70 ${meal.checked ? 'opacity-40' : ''}`}>
                                                                <span>{meal.time}</span>
                                                                <span>{Number.isInteger(mealKcal) ? mealKcal : mealKcal.toFixed(2)} KCAL</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startEditMeal(meal);
                                                            }}
                                                            className="text-[#a19e95] hover:text-[#1a1a1c] transition-colors p-2"
                                                            title="Editar refeição"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeMeal(meal.id);
                                                            }}
                                                            className="text-[#a19e95] hover:text-red-500 transition-colors p-2"
                                                            title="Excluir refeição"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Foods inside active meal */}
                <div className="xl:col-span-2 space-y-8">
                    {activeMeal ? (
                        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#f2eee3] shadow-sm flex flex-col min-h-[400px] md:min-h-[500px]">
                            <div className="flex justify-between items-end mb-6 md:mb-8 pb-4 md:pb-6 border-b border-dashed border-[#e6e2d6] gap-4">
                                <div className="flex-1">
                                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#a19e95] flex items-center gap-2 mb-2">
                                        <Utensils className="w-3 h-3" /> {activeMeal.time}
                                    </span>
                                    <h3 className="font-heading text-2xl md:text-3xl font-bold text-[#1a1a1c] truncate">{activeMeal.name}</h3>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="flex items-baseline justify-end gap-1 mb-1">
                                        <span className="font-mono-data text-2xl font-bold text-[#1a1a1c]">
                                            {(() => {
                                                const k = activeMeal.foods.reduce((sum, f) => sum + f.calories, 0);
                                                return Number.isInteger(k) ? k : k.toFixed(2);
                                            })()}
                                        </span>
                                        <span className="text-[10px] uppercase font-bold text-[#a19e95]">KCAL</span>
                                    </div>
                                    <div className="flex gap-3 text-[10px] font-mono-data text-[#8a877c] uppercase tracking-wider justify-end">
                                        {(() => {
                                            const p = activeMeal.foods.reduce((sum, f) => sum + f.protein, 0);
                                            const c = activeMeal.foods.reduce((sum, f) => sum + f.carbs, 0);
                                            const g = activeMeal.foods.reduce((sum, f) => sum + f.fats, 0);
                                            return (
                                                <>
                                                    <span>P: {Number.isInteger(p) ? p : p.toFixed(2)}g</span>
                                                    <span>C: {Number.isInteger(c) ? c : c.toFixed(2)}g</span>
                                                    <span>G: {Number.isInteger(g) ? g : g.toFixed(2)}g</span>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end mb-6">
                                <button
                                    onClick={() => setIsFoodModalOpen(true)}
                                    className="flex items-center gap-2 bg-[#f4f2ea] text-[#1a1a1c] border border-[#e6e2d6] px-5 py-2.5 rounded-full hover:bg-[#e6e2d6] transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Adicionar Alimento</span>
                                </button>
                            </div>

                            {/* Food List */}
                            <div className="flex-1">
                                {activeMeal.foods.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-[#a19e95] py-12">
                                        <Utensils className="w-8 h-8 mb-4 opacity-30" />
                                        <p className="text-[10px] font-mono-data tracking-widest uppercase">Sem alimentos nesta refeição</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {activeMeal.foods.map(food => (
                                            <div key={food.id} className="pb-4 border-b border-dashed border-[#e6e2d6] last:border-0 last:pb-0">
                                                {editingFoodId === food.id ? (
                                                    <div className="bg-[#f4f2ea] p-4 rounded-xl space-y-3">
                                                        <div className="flex gap-3">
                                                            <div className="flex-1">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Nome do alimento"
                                                                    value={editedFood.name}
                                                                    onChange={(e) => setEditedFood({ ...editedFood, name: e.target.value })}
                                                                    className="w-full bg-white border border-[#e6e2d6] rounded-lg px-3 py-2 text-sm text-[#1a1a1c] outline-none"
                                                                />
                                                            </div>
                                                            <div className="w-1/3">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Quantidade"
                                                                    value={editedFood.quantity}
                                                                    onChange={(e) => setEditedFood({ ...editedFood, quantity: e.target.value })}
                                                                    className="w-full bg-white border border-[#e6e2d6] rounded-lg px-3 py-2 text-sm text-[#1a1a1c] outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            <div>
                                                                <span className="text-[9px] text-[#88888b] uppercase tracking-widest font-bold block mb-1">P (g)</span>
                                                                <input
                                                                    type="number"
                                                                    value={editedFood.protein}
                                                                    onChange={(e) => setEditedFood({ ...editedFood, protein: e.target.value })}
                                                                    className="w-full bg-white border border-[#e6e2d6] rounded-lg px-2 py-1.5 text-xs text-[#1a1a1c] outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-[#88888b] uppercase tracking-widest font-bold block mb-1">C (g)</span>
                                                                <input
                                                                    type="number"
                                                                    value={editedFood.carbs}
                                                                    onChange={(e) => setEditedFood({ ...editedFood, carbs: e.target.value })}
                                                                    className="w-full bg-white border border-[#e6e2d6] rounded-lg px-2 py-1.5 text-xs text-[#1a1a1c] outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-[#88888b] uppercase tracking-widest font-bold block mb-1">G (g)</span>
                                                                <input
                                                                    type="number"
                                                                    value={editedFood.fats}
                                                                    onChange={(e) => setEditedFood({ ...editedFood, fats: e.target.value })}
                                                                    className="w-full bg-white border border-[#e6e2d6] rounded-lg px-2 py-1.5 text-xs text-[#1a1a1c] outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] text-[#88888b] uppercase tracking-widest font-bold block mb-1">Kcal</span>
                                                                <input
                                                                    type="number"
                                                                    value={editedFood.calories}
                                                                    onChange={(e) => setEditedFood({ ...editedFood, calories: e.target.value })}
                                                                    className="w-full bg-white border border-[#e6e2d6] rounded-lg px-2 py-1.5 text-xs text-[#1a1a1c] font-bold outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-2 mt-2">
                                                            <button onClick={cancelEditFood} className="bg-white border border-[#e6e2d6] text-[#1a1a1c] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-gray-50">
                                                                Cancelar
                                                            </button>
                                                            <button onClick={() => saveEditFood(activeMeal.id, food.id)} className="bg-[#1a1a1c] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-black">
                                                                Salvar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <h5 className="font-bold text-[#1a1a1c] text-sm">{food.name}</h5>
                                                            {food.quantity && (
                                                                <span className="block text-[11px] font-mono-data text-[#88888b] mt-0.5">{food.quantity}</span>
                                                            )}
                                                            <div className="flex gap-4 mt-1.5 text-[10px] font-mono-data text-[#8a877c] uppercase tracking-wider">
                                                                <span>P: {Number.isInteger(food.protein) ? food.protein : food.protein.toFixed(2)}g</span>
                                                                <span>C: {Number.isInteger(food.carbs) ? food.carbs : food.carbs.toFixed(2)}g</span>
                                                                <span>G: {Number.isInteger(food.fats) ? food.fats : food.fats.toFixed(2)}g</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-2">
                                                            <div className="text-right mr-2">
                                                                <span className="font-mono-data font-bold text-[#1a1a1c]">
                                                                    {Number.isInteger(food.calories) ? food.calories : food.calories.toFixed(2)}
                                                                </span>
                                                                <span className="text-[9px] uppercase tracking-widest text-[#a19e95] ml-1">Kcal</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openQuantityAdjustModal(activeMeal.id, food);
                                                                }}
                                                                className="text-[#a19e95] hover:text-[#1a1a1c] transition-colors p-2"
                                                                title="Ajustar proporcionalmente"
                                                            >
                                                                <ArrowUpDown className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startEditFood(food);
                                                                }}
                                                                className="text-[#a19e95] hover:text-[#1a1a1c] transition-colors p-2"
                                                                title="Editar alimento"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeFood(activeMeal.id, food.id);
                                                                }}
                                                                className="text-[#a19e95] hover:text-red-500 transition-colors p-2"
                                                                title="Excluir alimento"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-[#f2eee3] shadow-sm min-h-[500px] flex flex-col items-center justify-center">
                            <Utensils className="w-12 h-12 text-[#e6e2d6] mb-4" />
                            <p className="text-[#a19e95] text-sm font-mono-data uppercase tracking-widest">
                                Selecione ou crie uma refeição
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Adicionar Alimento */}
            {isFoodModalOpen && activeMeal && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm md:p-4">
                    <div
                        className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative animate-in slide-in-from-bottom-[100%] duration-300 md:slide-in-from-bottom-8 overflow-y-auto max-h-[90dvh]"
                    >
                        {/* Mobile handle indicator */}
                        <div className="w-12 h-1.5 bg-[#e6e2d6] rounded-full mx-auto md:hidden mb-6" />

                        <button
                            onClick={() => setIsFoodModalOpen(false)}
                            className="absolute top-6 right-6 p-2 text-[#a19e95] hover:text-[#1a1a1c] transition-colors rounded-full hover:bg-[#f4f2ea]"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h4 className="font-heading text-2xl font-bold text-[#1a1a1c] mb-2">Adicionar a {activeMeal.name}</h4>
                        <p className="text-xs text-[#a19e95] font-mono-data tracking-widest uppercase mb-8">Informações Nutricionais</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Nome do Alimento</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Arroz Branco Cozido"
                                    value={newFood.name}
                                    onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                                    className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95]"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Quantidade (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ex: 150g, 2 colheres, 1 fatia..."
                                    value={newFood.quantity}
                                    onChange={(e) => setNewFood({ ...newFood, quantity: e.target.value })}
                                    className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Proteínas (g)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0"
                                        value={newFood.protein}
                                        onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })}
                                        className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Carboidratos (g)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0"
                                        value={newFood.carbs}
                                        onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
                                        className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Gorduras (g)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0"
                                        value={newFood.fats}
                                        onChange={(e) => setNewFood({ ...newFood, fats: e.target.value })}
                                        className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Calorias (Kcal)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0"
                                        value={newFood.calories}
                                        onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                                        className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm font-bold placeholder-[#a19e95]"
                                    />
                                </div>
                            </div>

                            <div className="pt-6">
                                <button
                                    onClick={() => addFood(activeMeal.id)}
                                    className="w-full bg-[#1a1a1c] text-white rounded-xl py-4 text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors"
                                >
                                    Adicionar Alimento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Lista de Compras */}
            {isShoppingListOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl relative animate-in slide-in-from-bottom-[100%] duration-300 md:slide-in-from-bottom-8 flex flex-col max-h-[90vh]">
                        {/* Mobile handle indicator */}
                        <div className="w-12 h-1.5 bg-[#e6e2d6] rounded-full mx-auto md:hidden mb-6 shrink-0" />

                        <button
                            onClick={() => setIsShoppingListOpen(false)}
                            className="absolute top-6 right-6 p-2 text-[#a19e95] hover:text-[#1a1a1c] transition-colors rounded-full hover:bg-[#f4f2ea]"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h4 className="font-heading text-2xl font-bold text-[#1a1a1c] mb-2 shrink-0 flex items-center gap-3">
                            <ShoppingCart className="w-6 h-6" /> Lista de Compras
                        </h4>
                        <p className="text-xs text-[#a19e95] font-mono-data tracking-widest uppercase mb-6 shrink-0">
                            Todos os alimentos do seu plano
                        </p>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[300px]">
                            {meals.length === 0 || meals.every(m => m.foods.length === 0) ? (
                                <div className="h-full flex flex-col items-center justify-center text-[#a19e95] py-12">
                                    <ShoppingCart className="w-8 h-8 mb-4 opacity-30" />
                                    <p className="text-[10px] font-mono-data tracking-widest uppercase">Nenhum alimento na dieta</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {meals.filter(m => m.foods.length > 0).map(meal => (
                                        <div key={meal.id} className="space-y-3">
                                            <h5 className="font-bold text-[#1a1a1c] text-sm border-b border-[#e6e2d6] pb-2">{meal.name}</h5>
                                            <div className="space-y-2">
                                                {meal.foods.map(food => (
                                                    <div
                                                        key={food.id}
                                                        onClick={() => toggleFoodCheck(meal.id, food.id)}
                                                        className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${food.checked
                                                            ? "bg-[#f4f2ea] border-[#e6e2d6] opacity-60"
                                                            : "bg-white border-[#e6e2d6] hover:border-[#1a1a1c]"
                                                            }`}
                                                    >
                                                        <button className={`shrink-0 transition-colors ${food.checked ? 'text-green-600' : 'text-[#a19e95]'}`}>
                                                            {food.checked ? <CheckCircle2 className="w-5 h-5 fill-green-100" /> : <Circle className="w-5 h-5" />}
                                                        </button>
                                                        <div className="flex-1">
                                                            <span className={`font-bold text-sm block transition-all ${food.checked ? 'line-through text-[#88888b]' : 'text-[#1a1a1c]'}`}>
                                                                {food.name}
                                                            </span>
                                                            {food.quantity && (
                                                                <span className="text-[11px] font-mono-data text-[#88888b] mt-0.5 block">
                                                                    {food.quantity}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-6 shrink-0 border-t border-[#e6e2d6] mt-4 flex justify-between items-center text-xs text-[#a19e95] font-mono-data tracking-widest uppercase">
                            <span>
                                {meals.flatMap(m => m.foods).filter(f => f.checked).length} / {meals.flatMap(m => m.foods).length} Pegos
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Importar JSON */}
            {isJsonModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl relative animate-in slide-in-from-bottom-[100%] duration-300 md:slide-in-from-bottom-8">
                        {/* Mobile handle indicator */}
                        <div className="w-12 h-1.5 bg-[#e6e2d6] rounded-full mx-auto md:hidden mb-6" />

                        <button
                            onClick={() => setIsJsonModalOpen(false)}
                            className="absolute top-6 right-6 p-2 text-[#a19e95] hover:text-[#1a1a1c] transition-colors rounded-full hover:bg-[#f4f2ea]"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h4 className="font-heading text-2xl font-bold text-[#1a1a1c] mb-2">Importar Dieta</h4>
                        <p className="text-xs text-[#a19e95] font-mono-data tracking-widest uppercase mb-6">Cole o JSON do seu plano alimentar para substituir o atual</p>

                        <div className="space-y-4">
                            <textarea
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                placeholder={'[\n  {\n    "name": "Café da Manhã",\n    "time": "08:00",\n    "foods": [\n      { "name": "Ovo", "quantity": "2 unidades", "protein": 12, "carbs": 1, "fats": 10, "calories": 140 }\n    ]\n  }\n]'}
                                className="w-full h-[300px] bg-[#f4f2ea] border-none rounded-xl px-4 py-4 text-[#1a1a1c] outline-none text-sm font-mono placeholder-[#a19e95]/50 resize-none custom-scrollbar"
                            />

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsJsonModalOpen(false)}
                                    className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-[#a19e95] hover:bg-[#f4f2ea] hover:text-[#1a1a1c] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={importDietFromJson}
                                    className="bg-[#1a1a1c] text-white px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors"
                                >
                                    Processar JSON
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isQuantityAdjustModalOpen && quantityAdjustment && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-xl p-6 md:p-8 shadow-2xl relative animate-in slide-in-from-bottom-[100%] duration-300 md:slide-in-from-bottom-8">
                        <div className="w-12 h-1.5 bg-[#e6e2d6] rounded-full mx-auto md:hidden mb-6" />

                        <button
                            onClick={closeQuantityAdjustModal}
                            className="absolute top-6 right-6 p-2 text-[#a19e95] hover:text-[#1a1a1c] transition-colors rounded-full hover:bg-[#f4f2ea]"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-12 h-12 rounded-xl bg-[#f4f2ea] flex items-center justify-center mb-6">
                            <ArrowUpDown className="w-6 h-6 text-[#1a1a1c]" />
                        </div>

                        <h4 className="font-heading text-2xl font-bold text-[#1a1a1c] mb-2">Ajuste proporcional</h4>
                        <p className="text-xs text-[#a19e95] font-mono-data tracking-widest uppercase mb-8">
                            Recalcule quantidade, macros e calorias a partir do valor original
                        </p>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#f4f2ea] border border-[#e6e2d6] rounded-2xl p-4">
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#a19e95] block mb-2">Alimento</span>
                                    <span className="font-bold text-[#1a1a1c] block">{quantityAdjustment.foodName}</span>
                                    <span className="text-sm text-[#88888b] font-mono-data block mt-1">{quantityAdjustment.originalQuantity}</span>
                                </div>

                                <div className="bg-[#f4f2ea] border border-[#e6e2d6] rounded-2xl p-4">
                                    <label className="text-[10px] font-bold tracking-widest uppercase text-[#a19e95] block mb-2">
                                        Nova quantidade numerica
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={quantityAdjustment.newAmount}
                                        onChange={(e) => setQuantityAdjustment({ ...quantityAdjustment, newAmount: e.target.value })}
                                        className="w-full bg-white border border-[#e6e2d6] rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm"
                                    />
                                    <span className="text-[11px] text-[#88888b] block mt-2">
                                        Quantidade final:{" "}
                                        {Number.isFinite(adjustedAmountPreview)
                                            ? replaceQuantityNumber(quantityAdjustment.originalQuantity, adjustedAmountPreview)
                                            : quantityAdjustment.originalQuantity}
                                    </span>
                                </div>
                            </div>

                            {adjustedProportionPreview !== null && adjustingFood && (
                                <div className="border border-[#e6e2d6] rounded-2xl p-5 bg-white">
                                    <div className="flex items-center justify-between mb-4 gap-4">
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#a19e95]">
                                            Proporcao aplicada
                                        </span>
                                        <span className="font-mono-data text-sm font-bold text-[#1a1a1c]">
                                            {formatDecimal(adjustedProportionPreview * 100)}%
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-[#f4f2ea] rounded-xl border border-[#e6e2d6] p-3">
                                            <span className="text-[9px] font-bold tracking-widest uppercase text-[#a19e95] block mb-1">Proteinas</span>
                                            <span className="font-mono-data text-sm font-bold text-[#1a1a1c] block">{formatDecimal(adjustingFood.protein)}g</span>
                                            <span className="text-[11px] text-[#88888b] block mt-1">
                                                {formatDecimal(roundMacroValue(adjustingFood.protein * adjustedProportionPreview))}g
                                            </span>
                                        </div>
                                        <div className="bg-[#f4f2ea] rounded-xl border border-[#e6e2d6] p-3">
                                            <span className="text-[9px] font-bold tracking-widest uppercase text-[#a19e95] block mb-1">Carboidratos</span>
                                            <span className="font-mono-data text-sm font-bold text-[#1a1a1c] block">{formatDecimal(adjustingFood.carbs)}g</span>
                                            <span className="text-[11px] text-[#88888b] block mt-1">
                                                {formatDecimal(roundMacroValue(adjustingFood.carbs * adjustedProportionPreview))}g
                                            </span>
                                        </div>
                                        <div className="bg-[#f4f2ea] rounded-xl border border-[#e6e2d6] p-3">
                                            <span className="text-[9px] font-bold tracking-widest uppercase text-[#a19e95] block mb-1">Gorduras</span>
                                            <span className="font-mono-data text-sm font-bold text-[#1a1a1c] block">{formatDecimal(adjustingFood.fats)}g</span>
                                            <span className="text-[11px] text-[#88888b] block mt-1">
                                                {formatDecimal(roundMacroValue(adjustingFood.fats * adjustedProportionPreview))}g
                                            </span>
                                        </div>
                                        <div className="bg-[#f4f2ea] rounded-xl border border-[#e6e2d6] p-3">
                                            <span className="text-[9px] font-bold tracking-widest uppercase text-[#a19e95] block mb-1">Calorias</span>
                                            <span className="font-mono-data text-sm font-bold text-[#1a1a1c] block">{formatDecimal(adjustingFood.calories)}</span>
                                            <span className="text-[11px] text-[#88888b] block mt-1">
                                                {formatDecimal(roundMacroValue(adjustingFood.calories * adjustedProportionPreview))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={closeQuantityAdjustModal}
                                    className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-[#a19e95] hover:bg-[#f4f2ea] hover:text-[#1a1a1c] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveAdjustedFoodQuantity}
                                    className="bg-[#1a1a1c] text-white px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors"
                                >
                                    Aplicar ajuste
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isPdfModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-xl p-6 md:p-8 shadow-2xl relative animate-in slide-in-from-bottom-[100%] duration-300 md:slide-in-from-bottom-8">
                        <div className="w-12 h-1.5 bg-[#e6e2d6] rounded-full mx-auto md:hidden mb-6" />

                        <button
                            onClick={() => setIsPdfModalOpen(false)}
                            className="absolute top-6 right-6 p-2 text-[#a19e95] hover:text-[#1a1a1c] transition-colors rounded-full hover:bg-[#f4f2ea]"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-12 h-12 rounded-xl bg-[#f4f2ea] flex items-center justify-center mb-6">
                            <FileDown className="w-6 h-6 text-[#1a1a1c]" />
                        </div>

                        <h4 className="font-heading text-2xl font-bold text-[#1a1a1c] mb-2">Montar PDF</h4>
                        <p className="text-xs text-[#a19e95] font-mono-data tracking-widest uppercase mb-8">
                            Escolha as refeicoes e a suplementacao que devem entrar no documento
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#a19e95] block">Refeicoes</span>
                                    <span className="text-sm text-[#88888b]">
                                        {selectedPdfMealIds.length} selecionada(s) de {meals.length}
                                    </span>
                                </div>

                                {meals.length > 0 && (
                                    <button
                                        onClick={() => setSelectedPdfMealIds(allPdfMealsSelected ? [] : meals.map(meal => meal.id))}
                                        className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1c] hover:text-[#d84a22] transition-colors"
                                    >
                                        {allPdfMealsSelected ? "Limpar" : "Selecionar todas"}
                                    </button>
                                )}
                            </div>

                            {meals.length === 0 ? (
                                <div className="border border-dashed border-[#e6e2d6] rounded-2xl p-6 text-center text-sm text-[#88888b] bg-[#f4f2ea]/50">
                                    Nenhuma refeicao criada ainda.
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                                    {meals.map(meal => {
                                        const selected = selectedPdfMealIds.includes(meal.id);
                                        const mealCalories = meal.foods.reduce((sum, food) => sum + food.calories, 0);

                                        return (
                                            <button
                                                key={meal.id}
                                                onClick={() => togglePdfMealSelection(meal.id)}
                                                className={`w-full text-left border rounded-2xl p-4 transition-all ${selected
                                                    ? "border-[#1a1a1c] bg-[#f4f2ea]"
                                                    : "border-[#e6e2d6] bg-white hover:border-[#1a1a1c]"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        {selected ? (
                                                            <CheckCircle2 className="w-5 h-5 text-[#1a1a1c]" />
                                                        ) : (
                                                            <Circle className="w-5 h-5 text-[#a19e95]" />
                                                        )}
                                                        <div>
                                                            <span className="font-bold text-sm text-[#1a1a1c] block">{meal.name}</span>
                                                            <span className="text-[11px] font-mono-data text-[#88888b] uppercase tracking-wider">
                                                                {meal.time} • {Number.isInteger(mealCalories) ? mealCalories : mealCalories.toFixed(2)} kcal
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] text-[#a19e95] font-mono-data uppercase tracking-wider">
                                                        {meal.foods.length} alimento(s)
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <button
                                onClick={() => supplements.length > 0 && setIncludeSupplementsInPdf(current => !current)}
                                disabled={supplements.length === 0}
                                className={`w-full border rounded-2xl p-4 text-left transition-all ${includeSupplementsInPdf && supplements.length > 0
                                    ? "border-[#1a1a1c] bg-[#f4f2ea]"
                                    : "border-[#e6e2d6] bg-white"
                                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        {includeSupplementsInPdf && supplements.length > 0 ? (
                                            <CheckCircle2 className="w-5 h-5 text-[#1a1a1c]" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-[#a19e95]" />
                                        )}
                                        <div>
                                            <span className="font-bold text-sm text-[#1a1a1c] block">Adicionar suplementacao ao final</span>
                                            <span className="text-[11px] font-mono-data text-[#88888b] uppercase tracking-wider">
                                                {supplements.length > 0 ? `${supplements.length} suplemento(s) cadastrado(s)` : "Nenhum suplemento cadastrado"}
                                            </span>
                                        </div>
                                    </div>
                                    <Pill className="w-5 h-5 text-[#a19e95]" />
                                </div>
                            </button>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsPdfModalOpen(false)}
                                    className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-[#a19e95] hover:bg-[#f4f2ea] hover:text-[#1a1a1c] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={generatePDF}
                                    disabled={!canGeneratePdf || isGeneratingPDF}
                                    className="bg-[#1a1a1c] text-white px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50"
                                >
                                    {isGeneratingPDF ? "Gerando..." : "Gerar PDF"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Container Oculto para PDF */}
            <div id="pdf-content" className="hidden absolute top-0 left-0 bg-[#f4f2ea] w-[800px] p-12 text-[#1a1a1c] z-[-9999]">
                <div className="border border-[#e6e2d6] rounded-3xl p-10 bg-white shadow-sm font-sans mb-12">
                    <div className="flex justify-between items-end mb-10 pb-6 border-b border-[#e6e2d6]">
                        <div>
                            <h1 className="font-heading text-4xl font-bold tracking-tight mb-2 text-[#1a1a1c]">Plano Nutricional</h1>
                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#a19e95]">
                                Haumea Physique • Gerado em {new Date().toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        <div className="text-right">
                            <Flame className="w-8 h-8 text-[#d84a22] ml-auto mb-2" />
                            <div className="font-mono-data text-3xl font-bold text-[#1a1a1c]">
                                {Number.isInteger(pdfTotals.calories) ? pdfTotals.calories : pdfTotals.calories.toFixed(2)}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-[#88888b] tracking-widest">KCAL DIÁRIAS</span>
                        </div>
                    </div>

                    <div className="flex justify-between mb-12 bg-[#f4f2ea] p-6 rounded-2xl border border-[#e6e2d6]">
                        <div className="text-center flex-1">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-[#88888b] block mb-2">Proteínas</span>
                            <span className="font-mono-data text-2xl font-bold text-[#1a1a1c]">{Number.isInteger(pdfTotals.protein) ? pdfTotals.protein : pdfTotals.protein.toFixed(2)}g</span>
                        </div>
                        <div className="text-center flex-1 border-x border-[#e6e2d6]">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-[#88888b] block mb-2">Carboidratos</span>
                            <span className="font-mono-data text-2xl font-bold text-[#1a1a1c]">{Number.isInteger(pdfTotals.carbs) ? pdfTotals.carbs : pdfTotals.carbs.toFixed(2)}g</span>
                        </div>
                        <div className="text-center flex-1">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-[#88888b] block mb-2">Gorduras</span>
                            <span className="font-mono-data text-2xl font-bold text-[#1a1a1c]">{Number.isInteger(pdfTotals.fats) ? pdfTotals.fats : pdfTotals.fats.toFixed(2)}g</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {selectedPdfMeals.length === 0 && (
                            <div className="border border-dashed border-[#e6e2d6] rounded-2xl p-8 bg-[#f4f2ea]/50 text-center text-sm text-[#88888b]">
                                Nenhuma refeicao selecionada para este PDF.
                            </div>
                        )}

                        {selectedPdfMeals.map((meal) => {
                            const mealKcal = meal.foods.reduce((sum, f) => sum + f.calories, 0);
                            const p = meal.foods.reduce((sum, f) => sum + f.protein, 0);
                            const c = meal.foods.reduce((sum, f) => sum + f.carbs, 0);
                            const g = meal.foods.reduce((sum, f) => sum + f.fats, 0);
                            const mealSupplements: Supplement[] = [];

                            return (
                                <div key={meal.id} className="border border-[#e6e2d6] rounded-2xl p-6 bg-white shrink-0 break-inside-avoid shadow-sm relative overflow-hidden">
                                    {/* Side Color bar */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1a1a1c]"></div>

                                    <div className="flex justify-between items-end mb-5 border-b border-dashed border-[#e6e2d6] pb-4 pl-4">
                                        <div>
                                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#a19e95] flex items-center gap-2 mb-1.5">
                                                <Utensils className="w-3 h-3 text-[#1a1a1c]" /> {meal.time}
                                            </span>
                                            <h3 className="font-heading text-xl font-bold text-[#1a1a1c]">{meal.name}</h3>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono-data text-xl font-bold text-[#1a1a1c]">
                                                {Number.isInteger(mealKcal) ? mealKcal : mealKcal.toFixed(2)} <span className="text-[9px] uppercase tracking-widest text-[#a19e95]">Kcal</span>
                                            </div>
                                            <div className="flex gap-3 text-[9px] font-mono-data text-[#88888b] uppercase tracking-widest mt-1.5 justify-end">
                                                <span>P: {Number.isInteger(p) ? p : p.toFixed(2)}g</span>
                                                <span>C: {Number.isInteger(c) ? c : c.toFixed(2)}g</span>
                                                <span>G: {Number.isInteger(g) ? g : g.toFixed(2)}g</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pl-4">
                                        {meal.foods.length === 0 ? (
                                            <p className="text-[10px] text-[#a19e95]/60 uppercase tracking-widest font-mono-data py-3 text-center border border-dashed border-[#e6e2d6] rounded-xl bg-[#f4f2ea]/50">Nenhum alimento na refeição</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {meal.foods.map(food => (
                                                    <div key={food.id} className="flex flex-row justify-between items-center text-sm py-1 border-b border-dashed border-[#e6e2d6]/50 last:border-0 pb-3 last:pb-1">
                                                        <div className="flex-1">
                                                            <span className="font-bold text-[#1a1a1c] block">{food.name}</span>
                                                            {food.quantity && <span className="text-[11px] font-mono-data text-[#88888b] mt-0.5 block">{food.quantity}</span>}
                                                        </div>
                                                        <div className="text-right shrink-0 ml-4 flex flex-col items-end">
                                                            <div className="font-mono-data font-bold text-[#1a1a1c] text-base">
                                                                {Number.isInteger(food.calories) ? food.calories : food.calories.toFixed(2)} <span className="text-[9px] uppercase tracking-widest text-[#a19e95]">Kcal</span>
                                                            </div>
                                                            <div className="flex gap-2.5 text-[9px] font-mono-data text-[#8a877c] uppercase tracking-wider mt-1 justify-end">
                                                                <span>P: {Number.isInteger(food.protein) ? food.protein : food.protein.toFixed(1)}g</span>
                                                                <span>C: {Number.isInteger(food.carbs) ? food.carbs : food.carbs.toFixed(1)}g</span>
                                                                <span>G: {Number.isInteger(food.fats) ? food.fats : food.fats.toFixed(1)}g</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {mealSupplements.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-dashed border-[#e6e2d6]/80">
                                                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#a19e95] flex items-center gap-1.5 mb-2.5">
                                                    <Pill className="w-2.5 h-2.5 text-[#1a1a1c] opacity-60" /> Protocolo Injetado
                                                </span>
                                                <div className="space-y-2">
                                                    {mealSupplements.map(supp => (
                                                        <div key={supp.id} className="flex flex-row justify-between items-center text-sm py-0.5">
                                                            <div className="flex-1">
                                                                <span className="font-bold text-[#88888b] italic block tracking-wide">{supp.name}</span>
                                                            </div>
                                                            <div className="text-right shrink-0 ml-4">
                                                                <span className="text-[10px] font-mono-data text-[#a19e95] uppercase tracking-wider bg-[#f4f2ea] px-2 py-0.5 rounded-md">{supp.quantity || "Dose Única"}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {pdfSupplements.length > 0 && (
                            <div className="border border-[#e6e2d6] rounded-2xl p-6 bg-[#f4f2ea]/40 shrink-0 break-inside-avoid shadow-sm relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#a19e95]"></div>
                                <div className="flex justify-between items-end mb-4 border-b border-dashed border-[#e6e2d6] pb-3 pl-4">
                                    <div>
                                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#a19e95] flex items-center gap-2 mb-1.5">
                                            <Pill className="w-3 h-3 text-[#1a1a1c] opacity-60" /> Fora das Refeições
                                        </span>
                                        <h3 className="font-heading text-lg font-bold text-[#88888b]">Suplementação Avulsa</h3>
                                    </div>
                                </div>
                                <div className="pl-4 space-y-3">
                                    {pdfSupplements.map(supp => (
                                        <div key={supp.id} className="flex flex-row justify-between items-center text-sm py-1 border-b border-dashed border-[#e6e2d6]/50 last:border-0 pb-3 last:pb-1">
                                            <div className="flex-1">
                                                <span className="font-bold text-[#88888b] block">{supp.name}</span>
                                            </div>
                                            <div className="text-right shrink-0 ml-4 flex flex-col items-end">
                                                <span className="font-mono-data text-[#1a1a1c] text-sm font-bold opacity-80">{supp.time}</span>
                                                <span className="text-[9px] font-mono-data text-[#a19e95] uppercase tracking-wider mt-0.5">{supp.quantity || "Dose Única"}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-14 pt-8 border-t border-[rgba(230,226,214,0.5)] text-center flex flex-col items-center gap-2">
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#1a1a1c]">Documento Seguro e Verificado</span>
                        <span className="text-[9px] tracking-widest uppercase text-[#a19e95]">Haumea Physique Technology • {new Date().getFullYear()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
