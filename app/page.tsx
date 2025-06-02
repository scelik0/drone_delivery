"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Play, RotateCcw, Download, Zap, MapPin, Clock } from "lucide-react"
import { Visualization } from "@/components/visualization"
import { ScenarioSelector } from "@/components/scenario-selector"
import { ConstraintAnalysis } from "@/components/constraint-analysis"
import { ReportGenerator } from "@/components/report-generator"

// Veri yapıları
interface Drone {
  id: number
  max_weight: number
  battery: number
  speed: number
  start_pos: [number, number]
  current_pos?: [number, number]
  current_load?: number
  route?: number[]
}

interface Delivery {
  id: number
  pos: [number, number]
  weight: number
  priority: number
  time_window: [number, number]
  assigned_drone?: number
  completed?: boolean
}

interface NoFlyZone {
  id: number
  coordinates: [number, number][]
  active_time: [number, number]
  is_dynamic?: boolean
  movement_pattern?: {
    type: "circular" | "linear" | "random"
    speed: number
    center?: [number, number]
    radius?: number
    direction?: [number, number]
  }
}

interface RouteResult {
  algorithm: string
  routes: { [key: number]: number[] }
  total_distance: number
  completed_deliveries: number
  energy_consumption: number
  execution_time: number
}

export default function DroneDeliverySystem() {
  const [drones, setDrones] = useState<Drone[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [noFlyZones, setNoFlyZones] = useState<NoFlyZone[]>([])
  const [results, setResults] = useState<RouteResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentAlgorithm, setCurrentAlgorithm] = useState<string>("")
  const [currentScenario, setCurrentScenario] = useState<string>("scenario1")

  // Veri setini yükle
  useEffect(() => {
    loadScenario(currentScenario)
  }, [])

  const loadScenario = (scenarioType: string) => {
    if (scenarioType === "scenario1") {
      // Senaryo 1: 5 drone, 20 teslimat, 2 yasak bölge
      loadInitialData()
    } else if (scenarioType === "scenario2") {
      // Senaryo 2: 10 drone, 50 teslimat, 5 dinamik yasak bölge
      loadScenario2()
    }
  }

  // Dinamik yasak bölge koordinatlarını hesapla
  const getDynamicZoneCoordinates = (zone: NoFlyZone, currentTime: number): [number, number][] => {
    if (!zone.is_dynamic || !zone.movement_pattern) {
      return zone.coordinates
    }

    const pattern = zone.movement_pattern
    const timeInCycle = currentTime % 120 // 120 dakikalık döngü

    switch (pattern.type) {
      case "circular":
        if (pattern.center && pattern.radius) {
          const angle = (timeInCycle / 30) * 2 * Math.PI * pattern.speed // Daha hızlı dönüş
          const offsetX = Math.cos(angle) * pattern.radius
          const offsetY = Math.sin(angle) * pattern.radius

          return zone.coordinates.map(
            ([x, y]) =>
              [Math.max(5, Math.min(95, x + offsetX)), Math.max(5, Math.min(95, y + offsetY))] as [number, number],
          )
        }
        break

      case "linear":
        if (pattern.direction) {
          const progress = (timeInCycle / 40) % 2 // 40 dakikada ileri geri
          const direction = progress > 1 ? 2 - progress : progress
          const offsetX = pattern.direction[0] * direction * 25
          const offsetY = pattern.direction[1] * direction * 25

          return zone.coordinates.map(
            ([x, y]) =>
              [Math.max(5, Math.min(95, x + offsetX)), Math.max(5, Math.min(95, y + offsetY))] as [number, number],
          )
        }
        break

      case "random":
        const seed = Math.floor(timeInCycle / 8) // Her 8 dakikada bir değişir
        const randomX = ((Math.sin(seed * 2.1) * pattern.speed * 20) % 20) - 10
        const randomY = ((Math.cos(seed * 1.9) * pattern.speed * 20) % 20) - 10

        return zone.coordinates.map(
          ([x, y]) =>
            [Math.max(5, Math.min(95, x + randomX)), Math.max(5, Math.min(95, y + randomY))] as [number, number],
        )
    }

    return zone.coordinates
  }

  // Senaryo 2: 10 drone, 50 teslimat, 5 dinamik yasak bölge
  const loadScenario2 = () => {
    // İlk 5 drone'u verilen veri setinden al
    const baseDrones: Drone[] = [
      { id: 1, max_weight: 4.0, battery: 12000, speed: 8.0, start_pos: [10, 10] },
      { id: 2, max_weight: 3.5, battery: 10000, speed: 10.0, start_pos: [20, 30] },
      { id: 3, max_weight: 5.0, battery: 15000, speed: 7.0, start_pos: [50, 50] },
      { id: 4, max_weight: 2.0, battery: 8000, speed: 12.0, start_pos: [80, 20] },
      { id: 5, max_weight: 6.0, battery: 20000, speed: 5.0, start_pos: [40, 70] },
    ]

    // 5 drone daha ekle (toplam 10 drone)
    const additionalDrones: Drone[] = [
      { id: 6, max_weight: 3.0, battery: 11000, speed: 9.0, start_pos: [15, 85] },
      { id: 7, max_weight: 4.5, battery: 13000, speed: 8.5, start_pos: [75, 15] },
      { id: 8, max_weight: 2.5, battery: 9000, speed: 11.0, start_pos: [35, 25] },
      { id: 9, max_weight: 5.5, battery: 16000, speed: 6.5, start_pos: [65, 85] },
      { id: 10, max_weight: 3.8, battery: 12500, speed: 9.5, start_pos: [85, 65] },
    ]

    // İlk 20 teslimatı verilen veri setinden al
    const baseDeliveries: Delivery[] = [
      { id: 1, pos: [15, 25], weight: 1.5, priority: 3, time_window: [0, 60] },
      { id: 2, pos: [30, 40], weight: 2.0, priority: 5, time_window: [0, 30] },
      { id: 3, pos: [70, 80], weight: 3.0, priority: 2, time_window: [20, 80] },
      { id: 4, pos: [90, 10], weight: 1.0, priority: 4, time_window: [10, 40] },
      { id: 5, pos: [45, 60], weight: 4.0, priority: 1, time_window: [30, 90] },
      { id: 6, pos: [25, 15], weight: 2.5, priority: 3, time_window: [0, 50] },
      { id: 7, pos: [60, 30], weight: 1.0, priority: 5, time_window: [5, 25] },
      { id: 8, pos: [85, 90], weight: 3.5, priority: 2, time_window: [40, 100] },
      { id: 9, pos: [10, 80], weight: 2.0, priority: 4, time_window: [15, 45] },
      { id: 10, pos: [95, 50], weight: 1.5, priority: 3, time_window: [0, 60] },
      { id: 11, pos: [55, 20], weight: 0.5, priority: 5, time_window: [0, 20] },
      { id: 12, pos: [35, 75], weight: 2.0, priority: 1, time_window: [50, 120] },
      { id: 13, pos: [75, 40], weight: 3.0, priority: 3, time_window: [10, 50] },
      { id: 14, pos: [20, 90], weight: 1.5, priority: 4, time_window: [30, 70] },
      { id: 15, pos: [65, 65], weight: 4.5, priority: 2, time_window: [25, 75] },
      { id: 16, pos: [40, 10], weight: 2.0, priority: 5, time_window: [0, 30] },
      { id: 17, pos: [5, 50], weight: 1.0, priority: 3, time_window: [15, 55] },
      { id: 18, pos: [50, 85], weight: 3.0, priority: 1, time_window: [60, 100] },
      { id: 19, pos: [80, 70], weight: 2.5, priority: 4, time_window: [20, 60] },
      { id: 20, pos: [30, 55], weight: 1.5, priority: 2, time_window: [40, 80] },
    ]

    // 30 teslimat daha ekle (toplam 50 teslimat)
    const additionalDeliveries: Delivery[] = [
      { id: 21, pos: [12, 18], weight: 1.8, priority: 4, time_window: [5, 35] },
      { id: 22, pos: [88, 92], weight: 2.2, priority: 2, time_window: [45, 95] },
      { id: 23, pos: [33, 67], weight: 3.1, priority: 5, time_window: [0, 25] },
      { id: 24, pos: [77, 23], weight: 1.3, priority: 3, time_window: [20, 70] },
      { id: 25, pos: [56, 78], weight: 4.2, priority: 1, time_window: [60, 110] },
      { id: 26, pos: [19, 41], weight: 2.7, priority: 4, time_window: [10, 50] },
      { id: 27, pos: [82, 56], weight: 1.1, priority: 5, time_window: [0, 30] },
      { id: 28, pos: [44, 29], weight: 3.6, priority: 2, time_window: [35, 85] },
      { id: 29, pos: [67, 91], weight: 2.1, priority: 3, time_window: [25, 75] },
      { id: 30, pos: [23, 74], weight: 1.7, priority: 4, time_window: [15, 55] },
      { id: 31, pos: [45, 15], weight: 0.7, priority: 3, time_window: [0, 25] },
      { id: 32, pos: [10, 65], weight: 2.3, priority: 2, time_window: [50, 110] },
      { id: 33, pos: [75, 90], weight: 3.1, priority: 4, time_window: [10, 60] },
      { id: 34, pos: [25, 30], weight: 1.6, priority: 1, time_window: [30, 80] },
      { id: 35, pos: [65, 5], weight: 4.7, priority: 5, time_window: [25, 70] },
      { id: 36, pos: [40, 80], weight: 2.4, priority: 3, time_window: [0, 30] },
      { id: 37, pos: [5, 35], weight: 1.3, priority: 2, time_window: [15, 65] },
      { id: 38, pos: [55, 50], weight: 3.4, priority: 1, time_window: [60, 105] },
      { id: 39, pos: [90, 75], weight: 2.6, priority: 4, time_window: [20, 70] },
      { id: 40, pos: [30, 10], weight: 1.7, priority: 3, time_window: [40, 90] },
      { id: 41, pos: [70, 65], weight: 0.9, priority: 5, time_window: [0, 45] },
      { id: 42, pos: [15, 40], weight: 2.9, priority: 2, time_window: [5, 55] },
      { id: 43, pos: [80, 15], weight: 3.7, priority: 4, time_window: [45, 85] },
      { id: 44, pos: [45, 90], weight: 1.1, priority: 1, time_window: [10, 50] },
      { id: 45, pos: [60, 45], weight: 4.3, priority: 3, time_window: [35, 75] },
      { id: 46, pos: [20, 5], weight: 2.8, priority: 2, time_window: [20, 60] },
      { id: 47, pos: [95, 80], weight: 1.5, priority: 4, time_window: [50, 100] },
      { id: 48, pos: [5, 55], weight: 3.9, priority: 1, time_window: [15, 45] },
      { id: 49, pos: [50, 20], weight: 2.0, priority: 5, time_window: [0, 35] },
      { id: 50, pos: [85, 60], weight: 1.0, priority: 3, time_window: [30, 80] },
    ]

    // 5 dinamik yasak bölge
    const dynamicNoFlyZones: NoFlyZone[] = [
      {
        id: 1,
        coordinates: [
          [40, 30],
          [60, 30],
          [60, 50],
          [40, 50],
        ],
        active_time: [0, 120],
        is_dynamic: false, // Statik bölge
      },
      {
        id: 2,
        coordinates: [
          [70, 10],
          [90, 10],
          [90, 30],
          [70, 30],
        ],
        active_time: [30, 90],
        is_dynamic: true,
        movement_pattern: {
          type: "circular",
          speed: 1.0, // Daha hızlı
          center: [80, 20],
          radius: 8, // Daha büyük yarıçap
        },
      },
      {
        id: 3,
        coordinates: [
          [10, 60],
          [30, 60],
          [30, 80],
          [10, 80],
        ],
        active_time: [0, 60],
        is_dynamic: true,
        movement_pattern: {
          type: "linear",
          speed: 0.5,
          direction: [1, 0.3], // Daha belirgin hareket
        },
      },
      {
        id: 4,
        coordinates: [
          [25, 45],
          [45, 45],
          [45, 65],
          [25, 65],
        ],
        active_time: [20, 100],
        is_dynamic: true,
        movement_pattern: {
          type: "random",
          speed: 0.4, // Daha hızlı rastgele hareket
        },
      },
      {
        id: 5,
        coordinates: [
          [60, 70],
          [85, 70],
          [85, 95],
          [60, 95],
        ],
        active_time: [40, 120],
        is_dynamic: true,
        movement_pattern: {
          type: "circular",
          speed: 1.2, // En hızlı
          center: [72.5, 82.5],
          radius: 10, // En büyük yarıçap
        },
      },
    ]

    setDrones([...baseDrones, ...additionalDrones])
    setDeliveries([...baseDeliveries, ...additionalDeliveries])
    setNoFlyZones(dynamicNoFlyZones)
  }

  // Senaryo 1: 5 drone, 20 teslimat, 2 yasak bölge
  const loadInitialData = () => {
    const initialDrones: Drone[] = [
      { id: 1, max_weight: 4.0, battery: 12000, speed: 8.0, start_pos: [10, 10] },
      { id: 2, max_weight: 3.5, battery: 10000, speed: 10.0, start_pos: [20, 30] },
      { id: 3, max_weight: 5.0, battery: 15000, speed: 7.0, start_pos: [50, 50] },
      { id: 4, max_weight: 2.0, battery: 8000, speed: 12.0, start_pos: [80, 20] },
      { id: 5, max_weight: 6.0, battery: 20000, speed: 5.0, start_pos: [40, 70] },
    ]

    const initialDeliveries: Delivery[] = [
      { id: 1, pos: [15, 25], weight: 1.5, priority: 3, time_window: [0, 60] },
      { id: 2, pos: [30, 40], weight: 2.0, priority: 5, time_window: [0, 30] },
      { id: 3, pos: [70, 80], weight: 3.0, priority: 2, time_window: [20, 80] },
      { id: 4, pos: [90, 10], weight: 1.0, priority: 4, time_window: [10, 40] },
      { id: 5, pos: [45, 60], weight: 4.0, priority: 1, time_window: [30, 90] },
      { id: 6, pos: [25, 15], weight: 2.5, priority: 3, time_window: [0, 50] },
      { id: 7, pos: [60, 30], weight: 1.0, priority: 5, time_window: [5, 25] },
      { id: 8, pos: [85, 90], weight: 3.5, priority: 2, time_window: [40, 100] },
      { id: 9, pos: [10, 80], weight: 2.0, priority: 4, time_window: [15, 45] },
      { id: 10, pos: [95, 50], weight: 1.5, priority: 3, time_window: [0, 60] },
      { id: 11, pos: [55, 20], weight: 0.5, priority: 5, time_window: [0, 20] },
      { id: 12, pos: [35, 75], weight: 2.0, priority: 1, time_window: [50, 120] },
      { id: 13, pos: [75, 40], weight: 3.0, priority: 3, time_window: [10, 50] },
      { id: 14, pos: [20, 90], weight: 1.5, priority: 4, time_window: [30, 70] },
      { id: 15, pos: [65, 65], weight: 4.5, priority: 2, time_window: [25, 75] },
      { id: 16, pos: [40, 10], weight: 2.0, priority: 5, time_window: [0, 30] },
      { id: 17, pos: [5, 50], weight: 1.0, priority: 3, time_window: [15, 55] },
      { id: 18, pos: [50, 85], weight: 3.0, priority: 1, time_window: [60, 100] },
      { id: 19, pos: [80, 70], weight: 2.5, priority: 4, time_window: [20, 60] },
      { id: 20, pos: [30, 55], weight: 1.5, priority: 2, time_window: [40, 80] },
    ]

    // 2 yasak bölge (verilen veri setinden ilk 2'si)
    const initialNoFlyZones: NoFlyZone[] = [
      {
        id: 1,
        coordinates: [
          [40, 30],
          [60, 30],
          [60, 50],
          [40, 50],
        ],
        active_time: [0, 120],
        is_dynamic: false,
      },
      {
        id: 2,
        coordinates: [
          [70, 10],
          [90, 10],
          [90, 30],
          [70, 30],
        ],
        active_time: [30, 90],
        is_dynamic: false,
      },
    ]

    setDrones(initialDrones)
    setDeliveries(initialDeliveries)
    setNoFlyZones(initialNoFlyZones)
  }

  const handleScenarioChange = (scenario: string) => {
    setCurrentScenario(scenario)
    setResults([])
    if (scenario === "scenario1") {
      loadInitialData()
    } else {
      loadScenario2()
    }
  }

  // Mesafe hesaplama
  const calculateDistance = (pos1: [number, number], pos2: [number, number]): number => {
    return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2))
  }

  // Geliştirilmiş yasak bölge kontrolü
  const isInNoFlyZone = (pos: [number, number], time: number): boolean => {
    return noFlyZones.some((zone) => {
      // Zaman penceresi kontrolü
      if (time < zone.active_time[0] || time > zone.active_time[1]) return false

      // Dinamik bölge için güncel koordinatları al
      const currentCoords = zone.is_dynamic ? getDynamicZoneCoordinates(zone, time) : zone.coordinates

      // Point-in-polygon algoritması
      const x = pos[0],
        y = pos[1]
      let inside = false

      for (let i = 0, j = currentCoords.length - 1; i < currentCoords.length; j = i++) {
        if (
          currentCoords[i][1] > y !== currentCoords[j][1] > y &&
          x <
            ((currentCoords[j][0] - currentCoords[i][0]) * (y - currentCoords[i][1])) /
              (currentCoords[j][1] - currentCoords[i][1]) +
              currentCoords[i][0]
        ) {
          inside = !inside
        }
      }
      return inside
    })
  }

  // Rota üzerindeki tüm noktaların yasak bölge kontrolü
  const isRouteValid = (
    fromPos: [number, number],
    toPos: [number, number],
    startTime: number,
    speed: number,
  ): boolean => {
    const distance = calculateDistance(fromPos, toPos)
    const travelTime = distance / speed
    const steps = Math.ceil(distance / 2) // Her 2 birimde bir kontrol et

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps
      const currentPos: [number, number] = [
        fromPos[0] + (toPos[0] - fromPos[0]) * progress,
        fromPos[1] + (toPos[1] - fromPos[1]) * progress,
      ]
      const currentTime = startTime + travelTime * progress

      if (isInNoFlyZone(currentPos, currentTime)) {
        return false
      }
    }
    return true
  }

  // Güçlendirilmiş A* Algoritması
  const aStarAlgorithm = (): RouteResult => {
    const startTime = performance.now()
    const routes: { [key: number]: number[] } = {}
    let totalDistance = 0
    let completedDeliveries = 0
    let energyConsumption = 0

    // Öncelik sırasına göre teslimatları sırala
    const sortedDeliveries = [...deliveries].sort((a, b) => b.priority - a.priority)
    const availableDrones = drones.map((drone) => ({
      ...drone,
      current_pos: drone.start_pos,
      current_load: 0,
      current_time: 0,
    }))
    const assignedDeliveries = new Set<number>()

    for (const delivery of sortedDeliveries) {
      if (assignedDeliveries.has(delivery.id)) continue

      // Teslimat noktasının yasak bölgede olup olmadığını kontrol et
      if (isInNoFlyZone(delivery.pos, delivery.time_window[0])) {
        console.log(`Delivery ${delivery.id} is in no-fly zone, skipping`)
        continue
      }

      let bestDrone: any = null
      let bestDistance = Number.POSITIVE_INFINITY

      // En uygun drone'u bul
      for (const drone of availableDrones) {
        // Kapasite kontrolü
        if (drone.current_load + delivery.weight > drone.max_weight) continue

        const travelTime = calculateDistance(drone.current_pos, delivery.pos) / drone.speed
        const arrivalTime = drone.current_time + travelTime

        // Zaman penceresi kontrolü
        if (arrivalTime > delivery.time_window[1]) continue

        // Rota geçerliliği kontrolü (yasak bölgelerden kaçınma)
        if (!isRouteValid(drone.current_pos, delivery.pos, drone.current_time, drone.speed)) {
          console.log(`Route from drone ${drone.id} to delivery ${delivery.id} passes through no-fly zone`)
          continue
        }

        const distance = calculateDistance(drone.current_pos, delivery.pos)
        // Heuristik: mesafe + öncelik cezası + zaman penceresi cezası
        const heuristic =
          distance + (6 - delivery.priority) * 10 + Math.max(0, arrivalTime - delivery.time_window[1]) * 50

        if (heuristic < bestDistance) {
          bestDistance = heuristic
          bestDrone = drone
        }
      }

      if (bestDrone) {
        if (!routes[bestDrone.id]) routes[bestDrone.id] = []
        routes[bestDrone.id].push(delivery.id)

        const distance = calculateDistance(bestDrone.current_pos, delivery.pos)
        const travelTime = distance / bestDrone.speed

        totalDistance += distance
        energyConsumption += distance * delivery.weight * 0.1

        // Drone durumunu güncelle
        bestDrone.current_pos = delivery.pos
        bestDrone.current_load += delivery.weight
        bestDrone.current_time += travelTime

        assignedDeliveries.add(delivery.id)
        completedDeliveries++
      }
    }

    const endTime = performance.now()
    return {
      algorithm: "A* Algorithm",
      routes,
      total_distance: totalDistance,
      completed_deliveries: completedDeliveries,
      energy_consumption: energyConsumption,
      execution_time: endTime - startTime,
    }
  }

  // Optimize edilmiş CSP Algoritması
  const cspAlgorithm = (): RouteResult => {
    const startTime = performance.now()
    const MAX_TIME_LIMIT = 10000 // 10 saniye zaman sınırı
    const routes: { [key: number]: number[] } = {}
    let totalDistance = 0
    let completedDeliveries = 0
    let energyConsumption = 0

    // Yasak bölgede olmayan teslimatları filtrele ve önceliğe göre sırala
    const validDeliveries = deliveries
      .filter((delivery) => !isInNoFlyZone(delivery.pos, delivery.time_window[0]))
      .sort((a, b) => b.priority - a.priority) // Yüksek öncelikli teslimatları önce

    // Büyük problemler için teslimat sayısını sınırla
    const limitedDeliveries =
      currentScenario === "scenario2"
        ? validDeliveries.slice(0, 30) // Senaryo 2'de ilk 30 teslimatı al
        : validDeliveries

    console.log(`CSP: Processing ${limitedDeliveries.length} deliveries out of ${validDeliveries.length}`)

    const variables = limitedDeliveries.map((d) => d.id)
    const domains: { [key: number]: number[] } = {}

    // Domain reduction - her teslimat için uygun drone'ları belirle
    variables.forEach((deliveryId) => {
      const delivery = limitedDeliveries.find((d) => d.id === deliveryId)!
      domains[deliveryId] = drones
        .filter((drone) => {
          // Temel kısıtları kontrol et
          if (drone.max_weight < delivery.weight) return false
          if (!isRouteValid(drone.start_pos, delivery.pos, 0, drone.speed)) return false
          return true
        })
        .map((drone) => drone.id)
        .sort((a, b) => {
          // Drone'ları mesafeye göre sırala (en yakın önce)
          const droneA = drones.find((d) => d.id === a)!
          const droneB = drones.find((d) => d.id === b)!
          const distA = calculateDistance(droneA.start_pos, delivery.pos)
          const distB = calculateDistance(droneB.start_pos, delivery.pos)
          return distA - distB
        })
    })

    // Çözüm bulunamayan teslimatları filtrele
    const solvableVariables = variables.filter((id) => domains[id].length > 0)
    console.log(`CSP: ${solvableVariables.length} solvable deliveries`)

    if (solvableVariables.length === 0) {
      const endTime = performance.now()
      return {
        algorithm: "CSP Algorithm",
        routes: {},
        total_distance: 0,
        completed_deliveries: 0,
        energy_consumption: 0,
        execution_time: endTime - startTime,
      }
    }

    // Backtracking ile çözüm bul
    const assignment: { [key: number]: number } = {}
    const droneLoads: { [key: number]: number } = {}
    const droneTimes: { [key: number]: number } = {}
    const dronePositions: { [key: number]: [number, number] } = {}

    // Drone başlangıç durumlarını ayarla
    drones.forEach((drone) => {
      dronePositions[drone.id] = drone.start_pos
      droneTimes[drone.id] = 0
      droneLoads[drone.id] = 0
    })

    const isConsistent = (deliveryId: number, droneId: number): boolean => {
      const delivery = limitedDeliveries.find((d) => d.id === deliveryId)!
      const drone = drones.find((d) => d.id === droneId)!

      const currentLoad = droneLoads[droneId] || 0
      const currentTime = droneTimes[droneId] || 0
      const currentPos = dronePositions[droneId] || drone.start_pos

      // Kapasite kontrolü
      if (currentLoad + delivery.weight > drone.max_weight) return false

      // Zaman kontrolü
      const travelTime = calculateDistance(currentPos, delivery.pos) / drone.speed
      const arrivalTime = currentTime + travelTime
      if (arrivalTime > delivery.time_window[1]) return false

      // Rota geçerliliği kontrolü (basitleştirilmiş)
      if (isInNoFlyZone(delivery.pos, arrivalTime)) return false

      return true
    }

    // Most Constrained Variable heuristic - en az seçeneği olan teslimatı önce seç
    const selectVariable = (unassigned: number[]): number => {
      return unassigned.reduce((best, current) => {
        const currentDomainSize = domains[current].filter((droneId) => isConsistent(current, droneId)).length
        const bestDomainSize = domains[best].filter((droneId) => isConsistent(best, droneId)).length

        return currentDomainSize < bestDomainSize ? current : best
      })
    }

    const backtrack = (unassigned: number[]): boolean => {
      // Zaman sınırı kontrolü
      if (performance.now() - startTime > MAX_TIME_LIMIT) {
        console.log("CSP: Time limit exceeded")
        return false
      }

      if (unassigned.length === 0) return true

      const deliveryId = selectVariable(unassigned)
      const delivery = limitedDeliveries.find((d) => d.id === deliveryId)!
      const remainingUnassigned = unassigned.filter((id) => id !== deliveryId)

      // Least Constraining Value heuristic - en az kısıtlayıcı drone'u önce dene
      const sortedDrones = domains[deliveryId]
        .filter((droneId) => isConsistent(deliveryId, droneId))
        .sort((a, b) => {
          // Bu drone'u seçmenin diğer teslimatlar üzerindeki etkisini hesapla
          const impactA = remainingUnassigned.filter((otherId) => domains[otherId].includes(a)).length
          const impactB = remainingUnassigned.filter((otherId) => domains[otherId].includes(b)).length
          return impactB - impactA // Daha az etki eden önce
        })

      for (const droneId of sortedDrones) {
        // Backup state
        const oldLoad = droneLoads[droneId]
        const oldTime = droneTimes[droneId]
        const oldPos = dronePositions[droneId]

        // Atama yap
        assignment[deliveryId] = droneId
        droneLoads[droneId] = oldLoad + delivery.weight

        const travelTime = calculateDistance(oldPos, delivery.pos) / drones.find((d) => d.id === droneId)!.speed
        droneTimes[droneId] = oldTime + travelTime
        dronePositions[droneId] = delivery.pos

        if (backtrack(remainingUnassigned)) return true

        // Geri al
        delete assignment[deliveryId]
        droneLoads[droneId] = oldLoad
        droneTimes[droneId] = oldTime
        dronePositions[droneId] = oldPos
      }
      return false
    }

    const success = backtrack(solvableVariables)
    console.log(
      `CSP: ${success ? "Solution found" : "No solution found"} for ${Object.keys(assignment).length} deliveries`,
    )

    if (success || Object.keys(assignment).length > 0) {
      // Sonuçları routes formatına çevir
      Object.entries(assignment).forEach(([deliveryId, droneId]) => {
        if (!routes[droneId]) routes[droneId] = []
        routes[droneId].push(Number.parseInt(deliveryId))
        completedDeliveries++
      })

      // Mesafe ve enerji hesapla
      Object.entries(routes).forEach(([droneId, deliveryIds]) => {
        const drone = drones.find((d) => d.id === Number.parseInt(droneId))!
        let currentPos = drone.start_pos

        deliveryIds.forEach((deliveryId) => {
          const delivery = limitedDeliveries.find((d) => d.id === deliveryId)!
          const distance = calculateDistance(currentPos, delivery.pos)
          totalDistance += distance
          energyConsumption += distance * delivery.weight * 0.1
          currentPos = delivery.pos
        })
      })
    }

    const endTime = performance.now()
    return {
      algorithm: "CSP Algorithm",
      routes,
      total_distance: totalDistance,
      completed_deliveries: completedDeliveries,
      energy_consumption: energyConsumption,
      execution_time: endTime - startTime,
    }
  }

  // Güçlendirilmiş Genetik Algoritma
  const geneticAlgorithm = (): RouteResult => {
    const startTime = performance.now()
    const populationSize = 50
    const generations = 100
    const mutationRate = 0.1

    // Yasak bölgede olmayan teslimatları filtrele
    const validDeliveries = deliveries.filter((delivery) => !isInNoFlyZone(delivery.pos, delivery.time_window[0]))

    // Kromozom: her teslimat için drone ataması
    type Chromosome = number[]

    const createRandomChromosome = (): Chromosome => {
      return validDeliveries.map((delivery) => {
        const validDrones = drones.filter((drone) => {
          if (drone.max_weight < delivery.weight) return false
          if (!isRouteValid(drone.start_pos, delivery.pos, 0, drone.speed)) return false
          return true
        })
        return validDrones.length > 0 ? validDrones[Math.floor(Math.random() * validDrones.length)].id : 1
      })
    }

    const calculateFitness = (chromosome: Chromosome): number => {
      const droneRoutes: { [key: number]: number[] } = {}
      const droneLoads: { [key: number]: number } = {}
      const dronePositions: { [key: number]: [number, number] } = {}
      const droneTimes: { [key: number]: number } = {}
      let fitness = 0
      let violations = 0

      // Drone başlangıç durumlarını ayarla
      drones.forEach((drone) => {
        dronePositions[drone.id] = drone.start_pos
        droneTimes[drone.id] = 0
        droneLoads[drone.id] = 0
      })

      chromosome.forEach((droneId, index) => {
        const delivery = validDeliveries[index]

        if (!droneRoutes[droneId]) droneRoutes[droneId] = []
        droneRoutes[droneId].push(delivery.id)

        const drone = drones.find((d) => d.id === droneId)!
        const currentPos = dronePositions[droneId]
        const currentTime = droneTimes[droneId]
        const currentLoad = droneLoads[droneId]

        // Kapasite ihlali
        if (currentLoad + delivery.weight > drone.max_weight) {
          violations += 100
        } else {
          droneLoads[droneId] = currentLoad + delivery.weight
          fitness += delivery.priority * 10 // Öncelik bonusu
        }

        // Rota geçerliliği kontrolü
        if (!isRouteValid(currentPos, delivery.pos, currentTime, drone.speed)) {
          violations += 200 // Yasak bölge ihlali ağır ceza
        }

        // Zaman penceresi kontrolü
        const travelTime = calculateDistance(currentPos, delivery.pos) / drone.speed
        const arrivalTime = currentTime + travelTime
        if (arrivalTime > delivery.time_window[1]) {
          violations += 50
        }

        // Drone durumunu güncelle
        dronePositions[droneId] = delivery.pos
        droneTimes[droneId] = arrivalTime

        // Mesafe cezası
        const distance = calculateDistance(currentPos, delivery.pos)
        fitness -= distance * 0.5
      })

      return Math.max(0, fitness - violations)
    }

    const crossover = (parent1: Chromosome, parent2: Chromosome): [Chromosome, Chromosome] => {
      const crossoverPoint = Math.floor(Math.random() * parent1.length)
      const child1 = [...parent1.slice(0, crossoverPoint), ...parent2.slice(crossoverPoint)]
      const child2 = [...parent2.slice(0, crossoverPoint), ...parent1.slice(crossoverPoint)]
      return [child1, child2]
    }

    const mutate = (chromosome: Chromosome): Chromosome => {
      return chromosome.map((gene, index) => {
        if (Math.random() < mutationRate) {
          const delivery = validDeliveries[index]
          const validDrones = drones.filter((drone) => {
            if (drone.max_weight < delivery.weight) return false
            if (!isRouteValid(drone.start_pos, delivery.pos, 0, drone.speed)) return false
            return true
          })
          return validDrones.length > 0 ? validDrones[Math.floor(Math.random() * validDrones.length)].id : gene
        }
        return gene
      })
    }

    // İlk popülasyonu oluştur
    let population = Array.from({ length: populationSize }, createRandomChromosome)

    // Evrim döngüsü
    for (let gen = 0; gen < generations; gen++) {
      // Fitness hesapla ve sırala
      const fitnessScores = population.map(calculateFitness)
      const sortedIndices = fitnessScores
        .map((fitness, index) => ({ fitness, index }))
        .sort((a, b) => b.fitness - a.fitness)
        .map((item) => item.index)

      // Yeni nesil oluştur
      const newPopulation: Chromosome[] = []

      // En iyileri koru (elitism)
      for (let i = 0; i < populationSize * 0.2; i++) {
        newPopulation.push([...population[sortedIndices[i]]])
      }

      // Çaprazlama ve mutasyon
      while (newPopulation.length < populationSize) {
        const parent1 = population[sortedIndices[Math.floor(Math.random() * populationSize * 0.5)]]
        const parent2 = population[sortedIndices[Math.floor(Math.random() * populationSize * 0.5)]]

        const [child1, child2] = crossover(parent1, parent2)
        newPopulation.push(mutate(child1))
        if (newPopulation.length < populationSize) {
          newPopulation.push(mutate(child2))
        }
      }

      population = newPopulation
    }

    // En iyi çözümü al
    const finalFitnessScores = population.map(calculateFitness)
    const bestIndex = finalFitnessScores.indexOf(Math.max(...finalFitnessScores))
    const bestChromosome = population[bestIndex]

    // Sonuçları hesapla
    const routes: { [key: number]: number[] } = {}
    let totalDistance = 0
    let completedDeliveries = 0
    let energyConsumption = 0

    bestChromosome.forEach((droneId, index) => {
      const delivery = validDeliveries[index]
      if (!routes[droneId]) routes[droneId] = []
      routes[droneId].push(delivery.id)
      completedDeliveries++
    })

    Object.entries(routes).forEach(([droneId, deliveryIds]) => {
      const drone = drones.find((d) => d.id === Number.parseInt(droneId))!
      let currentPos = drone.start_pos

      deliveryIds.forEach((deliveryId) => {
        const delivery = validDeliveries.find((d) => d.id === deliveryId)!
        const distance = calculateDistance(currentPos, delivery.pos)
        totalDistance += distance
        energyConsumption += distance * delivery.weight * 0.1
        currentPos = delivery.pos
      })
    })

    const endTime = performance.now()
    return {
      algorithm: "Genetic Algorithm",
      routes,
      total_distance: totalDistance,
      completed_deliveries: completedDeliveries,
      energy_consumption: energyConsumption,
      execution_time: endTime - startTime,
    }
  }

  const runAlgorithm = async (algorithmType: string) => {
    setIsRunning(true)
    setCurrentAlgorithm(algorithmType)

    // Reset drone positions
    const resetDrones = drones.map((drone) => ({
      ...drone,
      current_pos: drone.start_pos,
      current_load: 0,
    }))
    setDrones(resetDrones)

    await new Promise((resolve) => setTimeout(resolve, 100))

    let result: RouteResult
    try {
      switch (algorithmType) {
        case "astar":
          result = aStarAlgorithm()
          break
        case "csp":
          result = cspAlgorithm()
          break
        case "genetic":
          result = geneticAlgorithm()
          break
        default:
          return
      }

      setResults((prev) => [...prev, result])
    } catch (error) {
      console.error(`Error in ${algorithmType}:`, error)
      // Hata durumunda boş sonuç ekle
      const errorResult: RouteResult = {
        algorithm:
          algorithmType === "astar" ? "A* Algorithm" : algorithmType === "csp" ? "CSP Algorithm" : "Genetic Algorithm",
        routes: {},
        total_distance: 0,
        completed_deliveries: 0,
        energy_consumption: 0,
        execution_time: 0,
      }
      setResults((prev) => [...prev, errorResult])
    }

    setIsRunning(false)
    setCurrentAlgorithm("")
  }

  const runAllAlgorithms = async () => {
    setResults([])
    await runAlgorithm("astar")
    await runAlgorithm("csp")
    await runAlgorithm("genetic")
  }

  const resetSystem = () => {
    setResults([])
    loadScenario(currentScenario)
  }

  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "drone_delivery_results.json"
    link.click()
  }

  const generateDetailedReport = (): string => {
    let report = `Drone Delivery Optimization Report - Scenario: ${currentScenario}\n\n`

    results.forEach((result) => {
      report += `Algorithm: ${result.algorithm}\n`
      report += `--------------------------------------------------\n`
      report += `Completed Deliveries: ${result.completed_deliveries} / ${deliveries.length}\n`
      report += `Total Distance: ${result.total_distance.toFixed(2)}\n`
      report += `Energy Consumption: ${result.energy_consumption.toFixed(2)}\n`
      report += `Execution Time: ${result.execution_time.toFixed(2)} ms\n\n`

      report += `Drone Routes:\n`
      Object.entries(result.routes).forEach(([droneId, deliveryIds]) => {
        report += `  Drone ${droneId}: ${deliveryIds.join(", ")}\n`
      })
      report += `\n`
    })

    return report
  }

  const exportReadableResults = () => {
    const report = generateDetailedReport()
    const dataBlob = new Blob([report], { type: "text/plain" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `drone_delivery_report_${currentScenario}.txt`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Drone Teslimat Rota Optimizasyonu</h1>
          <p className="text-lg text-gray-600">A*, CSP ve Genetik Algoritma ile Optimal Rota Planlama</p>
          <div className="flex justify-center gap-4">
            <Badge variant="outline">Senaryo 1: 5 Drone, 20 Teslimat, 2 Yasak Bölge</Badge>
            <Badge variant="outline">Senaryo 2: 10 Drone, 50 Teslimat, 5 Dinamik Yasak Bölge</Badge>
          </div>
        </div>

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Kontrol Paneli
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Senaryo Seçimi */}
            <ScenarioSelector
              currentScenario={currentScenario}
              onScenarioChange={handleScenarioChange}
              drones={drones}
              deliveries={deliveries}
              noFlyZones={noFlyZones}
            />
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => runAlgorithm("astar")} disabled={isRunning} variant="outline">
                <Play className="h-4 w-4 mr-2" />
                A* Algoritması
              </Button>
              <Button onClick={() => runAlgorithm("csp")} disabled={isRunning} variant="outline">
                <Play className="h-4 w-4 mr-2" />
                CSP Algoritması
              </Button>
              <Button onClick={() => runAlgorithm("genetic")} disabled={isRunning} variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Genetik Algoritma
              </Button>
              <Button onClick={runAllAlgorithms} disabled={isRunning} className="bg-blue-600 hover:bg-blue-700">
                <Play className="h-4 w-4 mr-2" />
                Tüm Algoritmaları Çalıştır
              </Button>
              <Button onClick={resetSystem} disabled={isRunning} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Sıfırla
              </Button>
              {results.length > 0 && (
                <Button onClick={exportReadableResults} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Sonuçları İndir
                </Button>
              )}
            </div>
            {isRunning && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  {currentAlgorithm} çalışıyor...
                  {currentAlgorithm === "CSP Algorithm" &&
                    currentScenario === "scenario2" &&
                    " (Büyük veri seti için optimize edildi - 30 teslimat işleniyor)"}
                </p>
                <Progress value={33} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Drone Filosu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{drones.length}</p>
                <p className="text-sm text-gray-600">Toplam Drone</p>
                <div className="space-y-1">
                  {drones.slice(0, 5).map((drone) => (
                    <div key={drone.id} className="flex justify-between text-xs">
                      <span>Drone {drone.id}</span>
                      <Badge variant="outline">{drone.max_weight}kg</Badge>
                    </div>
                  ))}
                  {drones.length > 5 && <div className="text-xs text-gray-500">+{drones.length - 5} daha...</div>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Teslimat Noktaları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{deliveries.length}</p>
                <p className="text-sm text-gray-600">Toplam Teslimat</p>
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map((priority) => {
                    const count = deliveries.filter((d) => d.priority === priority).length
                    return (
                      <div key={priority} className="flex justify-between text-xs">
                        <span>Öncelik {priority}</span>
                        <Badge variant={priority >= 4 ? "destructive" : "secondary"}>{count}</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Yasak Bölgeler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{noFlyZones.length}</p>
                <p className="text-sm text-gray-600">
                  {currentScenario === "scenario2" ? "Dinamik Kısıt" : "Statik Kısıt"}
                </p>
                <div className="space-y-1">
                  {noFlyZones.map((zone) => (
                    <div key={zone.id} className="flex justify-between text-xs">
                      <span>Bölge {zone.id}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline">
                          {zone.active_time[0]}-{zone.active_time[1]}
                        </Badge>
                        {zone.is_dynamic && (
                          <Badge variant="destructive" className="text-xs">
                            Dinamik
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kısıt Analizi */}
        {results.length > 0 && (
          <ConstraintAnalysis
            drones={drones}
            deliveries={deliveries}
            noFlyZones={noFlyZones}
            routes={results[results.length - 1].routes}
          />
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Algoritma Sonuçları</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="comparison" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="comparison">Karşılaştırma</TabsTrigger>
                  <TabsTrigger value="astar">A* Detay</TabsTrigger>
                  <TabsTrigger value="csp">CSP Detay</TabsTrigger>
                  <TabsTrigger value="genetic">Genetik Detay</TabsTrigger>
                </TabsList>

                <TabsContent value="comparison" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {results.map((result, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{result.algorithm}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Tamamlanan:</span>
                              <Badge variant="outline">
                                {result.completed_deliveries}/{deliveries.length}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Mesafe:</span>
                              <span>{result.total_distance.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Enerji:</span>
                              <span>{result.energy_consumption.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Süre:</span>
                              <span>{result.execution_time.toFixed(1)}ms</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {currentScenario === "scenario2" && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <strong>Not:</strong> Senaryo 2'de CSP algoritması performans için ilk 30 teslimatı işler. Tam
                        çözüm için A* veya Genetik Algoritma önerilir.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {results.map((result, index) => (
                  <TabsContent
                    key={result.algorithm}
                    value={result.algorithm.toLowerCase().split(" ")[0]}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Performans Metrikleri</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span>Tamamlanan Teslimat:</span>
                            <Badge variant="outline">
                              {result.completed_deliveries}/{deliveries.length}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Toplam Mesafe:</span>
                            <span>{result.total_distance.toFixed(2)} birim</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Enerji Tüketimi:</span>
                            <span>{result.energy_consumption.toFixed(2)} birim</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Çalışma Süresi:</span>
                            <span>{result.execution_time.toFixed(2)} ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Başarı Oranı:</span>
                            <Badge
                              variant={result.completed_deliveries > deliveries.length * 0.8 ? "default" : "secondary"}
                            >
                              {((result.completed_deliveries / deliveries.length) * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Drone Rotaları</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {Object.entries(result.routes).map(([droneId, deliveryIds]) => (
                              <div key={droneId} className="border rounded p-2">
                                <div className="font-medium text-sm mb-1">Drone {droneId}</div>
                                <div className="flex flex-wrap gap-1">
                                  {deliveryIds.map((deliveryId) => (
                                    <Badge key={deliveryId} variant="outline" className="text-xs">
                                      T{deliveryId}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Rapor Oluşturma */}
        <ReportGenerator
          results={results}
          drones={drones}
          deliveries={deliveries}
          noFlyZones={noFlyZones}
          currentScenario={currentScenario}
        />

        {/* Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Rota Görselleştirmesi</CardTitle>
          </CardHeader>
          <CardContent>
            <Visualization
              drones={drones}
              deliveries={deliveries}
              noFlyZones={noFlyZones}
              routes={results.length > 0 ? results[results.length - 1].routes : {}}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
