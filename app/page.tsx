"use client"

import {useEffect, useState} from "react"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Alert, AlertDescription} from "@/components/ui/alert"
import {AlertTriangle, CheckCircle, Clock, Trash2} from "lucide-react"
import {Button} from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface DaySchedule {
    entrata: string
    uscita: string
    totaleOre: number
}

interface WeekSchedule {
    [key: string]: DaySchedule
}

const GIORNI_SETTIMANA = [
    {key: "lunedi", label: "Lunedì"},
    {key: "martedi", label: "Martedì"},
    {key: "mercoledi", label: "Mercoledì"},
    {key: "giovedi", label: "Giovedì"},
    {key: "venerdi", label: "Venerdì"},
]

const ORE_SETTIMANALI_TARGET = 36
const STORAGE_KEY = "timesheet_schedule"

export default function TimesheetTracker() {
    const [schedule, setSchedule] = useState<WeekSchedule>(() => {
        // Prova a caricare i dati dal localStorage
        if (typeof window !== 'undefined') {
            try {
                const savedSchedule = localStorage.getItem(STORAGE_KEY)
                if (savedSchedule) {
                    return JSON.parse(savedSchedule)
                }
            } catch (error) {
                console.error("Errore nel caricamento dei dati dal localStorage:", error)
            }
        }

        // Se non ci sono dati salvati, crea schedule vuoto iniziale
        const initialSchedule: WeekSchedule = {}
        GIORNI_SETTIMANA.forEach((giorno) => {
            initialSchedule[giorno.key] = {
                entrata: "",
                uscita: "",
                totaleOre: 0,
            }
        })
        return initialSchedule
    })

    const [oreTotaliSettimana, setOreTotaliSettimana] = useState(0)
    const [suggerimentoUscita, setSuggerimentoUscita] = useState<{ giorno: string; orario: string } | null>(null)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    // Funzione per salvare nel localStorage
    const saveToLocalStorage = (scheduleData: WeekSchedule) => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduleData))
            } catch (error) {
                console.error("Errore nel salvataggio dei dati nel localStorage:", error)
            }
        }
    }

    // Funzione per convertire orario in minuti
    const timeToMinutes = (time: string): number => {
        if (!time) return 0
        const [hours, minutes] = time.split(":").map(Number)
        return hours * 60 + minutes
    }

    // Funzione per convertire minuti in orario
    const minutesToTime = (minutes: number): string => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
    }

    // Funzione per calcolare ore tra due orari
    const calcolaOre = (entrata: string, uscita: string): number => {
        if (!entrata || !uscita) return 0
        const minutiEntrata = timeToMinutes(entrata)
        const minutiUscita = timeToMinutes(uscita)
        const differenza = minutiUscita - minutiEntrata
        const differenzaConPausa = differenza - 30 // sottrai 30 minuti di pausa pranzo
        return differenzaConPausa > 0 ? differenzaConPausa / 60 : 0
    }

    // Funzione per formattare le ore
    const formatOre = (ore: number): string => {
        const oreIntere = Math.floor(ore)
        const minuti = Math.round((ore - oreIntere) * 60)
        if (minuti === 0) return `${oreIntere}h`
        return `${oreIntere}h ${minuti}m`
    }

    // Funzione per cancellare tutti i dati
    const cancellaAllDati = () => {
        const scheduleVuoto: WeekSchedule = {}
        GIORNI_SETTIMANA.forEach((giorno) => {
            scheduleVuoto[giorno.key] = {
                entrata: "",
                uscita: "",
                totaleOre: 0,
            }
        })
        setSchedule(scheduleVuoto)
        saveToLocalStorage(scheduleVuoto)
        setShowDeleteDialog(false)
    }

    // Aggiorna orario
    const aggiornaOrario = (giorno: string, tipo: "entrata" | "uscita", valore: string) => {
        setSchedule((prev) => {
            const nuovoSchedule = {...prev}
            nuovoSchedule[giorno] = {...nuovoSchedule[giorno], [tipo]: valore}

            // Ricalcola le ore per questo giorno
            const {entrata, uscita} = nuovoSchedule[giorno]
            nuovoSchedule[giorno].totaleOre = calcolaOre(entrata, uscita)

            // Salva nel localStorage
            saveToLocalStorage(nuovoSchedule)

            return nuovoSchedule
        })
    }

    // Effetto per calcolare totali e suggerimenti
    useEffect(() => {
        // Calcola ore totali settimana
        const totale = Object.values(schedule).reduce((sum, day) => sum + day.totaleOre, 0)
        setOreTotaliSettimana(totale)

        // Trova giorno incompleto per suggerimento
        const giornoIncompleto = GIORNI_SETTIMANA.find(({key}) => {
            const day = schedule[key]
            return day.entrata && !day.uscita
        })

        if (giornoIncompleto && totale < ORE_SETTIMANALI_TARGET) {
            const oreRimanenti = ORE_SETTIMANALI_TARGET - totale
            const entrataMinuti = timeToMinutes(schedule[giornoIncompleto.key].entrata)
            // Aggiungi 30 minuti per la pausa pranzo al calcolo dell'orario suggerito
            const uscitaSuggerita = entrataMinuti + (oreRimanenti * 60) + 30

            // Verifica che l'orario suggerito sia ragionevole (non oltre le 20:00)
            if (uscitaSuggerita <= timeToMinutes("20:00")) {
                setSuggerimentoUscita({
                    giorno: giornoIncompleto.label,
                    orario: minutesToTime(uscitaSuggerita),
                })
            } else {
                setSuggerimentoUscita(null)
            }
        } else {
            setSuggerimentoUscita(null)
        }
    }, [schedule])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Clock className="h-8 w-8 text-blue-600"/>
                        <h1 className="text-3xl font-bold text-slate-800">Timesheet Tracker</h1>
                    </div>

                    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="pt-6">
                            <div className="text-4xl font-bold text-slate-800 mb-2">
                                Ore Totali {formatOre(oreTotaliSettimana)}/36
                            </div>
                            <div className="text-sm text-slate-600">
                                {oreTotaliSettimana >= ORE_SETTIMANALI_TARGET ? (
                                    <span className="text-green-600 font-medium">✓ Obiettivo raggiunto!</span>
                                ) : (
                                    <span>Mancano {formatOre(ORE_SETTIMANALI_TARGET - oreTotaliSettimana)}</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Suggerimento automatico */}
                {suggerimentoUscita && (
                    <Alert className="bg-blue-50 border-blue-200">
                        <CheckCircle className="h-4 w-4 text-blue-600"/>
                        <AlertDescription className="text-blue-800">
                            <strong>Suggerimento</strong>
                            <div>
                                Per completare le 36 ore, esci alle{" "}
                                <strong>{suggerimentoUscita.orario}</strong> {" "} {suggerimentoUscita.giorno.toLowerCase()}.
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Alert se si superano le 36 ore */}
                {oreTotaliSettimana > ORE_SETTIMANALI_TARGET && (
                    <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600"/>
                        <AlertDescription className="text-amber-800">
                            <strong>Attenzione:</strong> Hai superato le 36 ore settimanali di{" "}
                            <strong>{(oreTotaliSettimana - ORE_SETTIMANALI_TARGET).toFixed(1)} ore</strong>.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Tabella orari */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl text-slate-800">Orari Settimanali</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Giorno</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Entrata</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Uscita</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Totale Ore</th>
                                </tr>
                                </thead>
                                <tbody>
                                {GIORNI_SETTIMANA.map(({key, label}) => (
                                    <tr key={key}
                                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-4 font-medium text-slate-700">{label}</td>
                                        <td className="py-4 px-4">
                                            <Input
                                                type="time"
                                                value={schedule[key].entrata}
                                                onChange={(e) => aggiornaOrario(key, "entrata", e.target.value)}
                                                className="w-32 bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                                            />
                                        </td>
                                        <td className="py-4 px-4">
                                            <Input
                                                type="time"
                                                value={schedule[key].uscita}
                                                onChange={(e) => aggiornaOrario(key, "uscita", e.target.value)}
                                                className="w-32 bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                                            />
                                        </td>
                                        <td className="py-4 px-4">
                        <span
                            className={`font-semibold ${
                                schedule[key].totaleOre > 0 ? "text-green-600" : "text-slate-400"
                            }`}
                        >
                          {schedule[key].totaleOre > 0 ? formatOre(schedule[key].totaleOre) : "-"}
                        </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                                <tfoot>
                                <tr className="border-t-2 border-slate-300 bg-slate-50/50">
                                    <td className="py-4 px-4 font-bold text-slate-800" colSpan={3}>
                                        Totale Settimanale
                                    </td>
                                    <td className="py-4 px-4">
                      <span
                          className={`text-lg font-bold ${
                              oreTotaliSettimana >= ORE_SETTIMANALI_TARGET
                                  ? "text-green-600"
                                  : oreTotaliSettimana > 0
                                      ? "text-blue-600"
                                      : "text-slate-400"
                          }`}
                      >
                        {oreTotaliSettimana > 0 ? formatOre(oreTotaliSettimana) : "-"}
                      </span>
                                    </td>
                                </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Progress bar */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Progresso settimanale</span>
                                <span>{Math.min(100, (oreTotaliSettimana / ORE_SETTIMANALI_TARGET) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-500 ${
                                        oreTotaliSettimana >= ORE_SETTIMANALI_TARGET
                                            ? "bg-green-500"
                                            : oreTotaliSettimana > ORE_SETTIMANALI_TARGET * 0.8
                                                ? "bg-blue-500"
                                                : "bg-blue-400"
                                    }`}
                                    style={{
                                        width: `${Math.min(100, (oreTotaliSettimana / ORE_SETTIMANALI_TARGET) * 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bottone cancella tutto */}
                <div className="flex justify-center pt-4">
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="gap-2">
                                <Trash2 className="h-4 w-4"/>
                                Cancella Tutti i Dati
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Conferma Cancellazione</DialogTitle>
                                <DialogDescription>
                                    Sei sicuro di voler cancellare tutti i dati del timesheet? Questa azione non può
                                    essere annullata.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                    Annulla
                                </Button>
                                <Button variant="destructive" onClick={cancellaAllDati}>
                                    Conferma Cancellazione
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    )
}