"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ZoomIn, ZoomOut, RotateCcw, Play, Pause, FastForward } from "lucide-react"

interface VisualizationProps {
  drones: any[]
  deliveries: any[]
  noFlyZones: any[]
  routes: { [key: number]: number[] }
}

interface AnimatedDrone {
  id: number
  currentPos: [number, number]
  targetPos: [number, number]
  speed: number
  progress: number
  route: number[]
  currentRouteIndex: number
  isMoving: boolean
  color: string
  load: number
  maxWeight: number
}

export function Visualization({ drones, deliveries, noFlyZones, routes }: VisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [animationTime, setAnimationTime] = useState(0)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [animatedDrones, setAnimatedDrones] = useState<AnimatedDrone[]>([])
  const [completedDeliveries, setCompletedDeliveries] = useState<Set<number>>(new Set())

  const droneColors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98FB98", "#F0E68C"]

  // Drone'ları başlangıç durumuna getir
  useEffect(() => {
    initializeDrones()
  }, [drones, routes])

  // Animasyon döngüsü
  useEffect(() => {
    let animationFrame: number

    const animate = () => {
      if (isPlaying) {
        setAnimationTime((prev) => (prev + 0.2 * animationSpeed) % 120) // 120 dakikalık döngü
        updateDronePositions()
      }
      animationFrame = requestAnimationFrame(animate)
    }

    // Animasyonu başlat
    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [isPlaying, animationSpeed])

  // Görselleştirmeyi çiz
  useEffect(() => {
    drawVisualization()
  }, [drones, deliveries, noFlyZones, routes, zoom, offset, animationTime, animatedDrones, completedDeliveries])

  // Drone'ları başlangıç durumuna getir
  const initializeDrones = () => {
    const newAnimatedDrones: AnimatedDrone[] = []
    setCompletedDeliveries(new Set())

    drones.forEach((drone, index) => {
      const droneRoutes = routes[drone.id] || []

      newAnimatedDrones.push({
        id: drone.id,
        currentPos: [...drone.start_pos] as [number, number],
        targetPos: [...drone.start_pos] as [number, number],
        speed: drone.speed,
        progress: 0,
        route: droneRoutes,
        currentRouteIndex: -1, // Henüz rotaya başlamadı
        isMoving: false,
        color: droneColors[index % droneColors.length],
        load: 0,
        maxWeight: drone.max_weight,
      })
    })

    setAnimatedDrones(newAnimatedDrones)
  }

  // Drone pozisyonlarını güncelle
  const updateDronePositions = () => {
    setAnimatedDrones((prevDrones) => {
      return prevDrones.map((drone) => {
        // Drone hareket etmiyorsa ve rotada gidecek yer varsa
        if (!drone.isMoving && drone.currentRouteIndex < drone.route.length - 1) {
          // Bir sonraki teslimat noktasına geç
          const nextIndex = drone.currentRouteIndex + 1
          const nextDeliveryId = drone.route[nextIndex]
          const nextDelivery = deliveries.find((d) => d.id === nextDeliveryId)

          if (nextDelivery) {
            // Yasak bölge kontrolü
            const isPathSafe =
              !isInNoFlyZone(drone.currentPos, animationTime) && !isInNoFlyZone(nextDelivery.pos, animationTime)

            if (isPathSafe) {
              return {
                ...drone,
                targetPos: [...nextDelivery.pos] as [number, number],
                progress: 0,
                isMoving: true,
                currentRouteIndex: nextIndex,
                load: drone.load + nextDelivery.weight,
              }
            }
            // Eğer yol güvenli değilse bekle
            return drone
          }
        }

        // Drone hareket ediyorsa
        if (drone.isMoving) {
          // İlerleme durumunu güncelle
          const distance = calculateDistance(drone.currentPos, drone.targetPos)
          const step = (drone.speed * 0.2 * animationSpeed) / distance
          const newProgress = Math.min(drone.progress + step, 1)

          // Yeni pozisyonu hesapla
          const newPos: [number, number] = [
            drone.currentPos[0] + (drone.targetPos[0] - drone.currentPos[0]) * step,
            drone.currentPos[1] + (drone.targetPos[1] - drone.currentPos[1]) * step,
          ]

          // Eğer varış noktasına ulaştıysa
          if (newProgress >= 1) {
            // Teslimatı tamamlandı olarak işaretle
            if (drone.currentRouteIndex >= 0) {
              const deliveryId = drone.route[drone.currentRouteIndex]
              setCompletedDeliveries((prev) => new Set([...prev, deliveryId]))
            }

            return {
              ...drone,
              currentPos: [...drone.targetPos] as [number, number],
              progress: 0,
              isMoving: false,
            }
          }

          // Hala hareket ediyorsa
          return {
            ...drone,
            currentPos: newPos,
            progress: newProgress,
          }
        }

        return drone
      })
    })
  }

  // Dinamik yasak bölge koordinatlarını hesapla
  const getDynamicZoneCoordinates = (zone: any, currentTime: number): [number, number][] => {
    if (!zone.is_dynamic || !zone.movement_pattern) {
      return zone.coordinates
    }

    const pattern = zone.movement_pattern
    const timeInCycle = currentTime % 120

    switch (pattern.type) {
      case "circular":
        if (pattern.center && pattern.radius) {
          const angle = (timeInCycle / 30) * 2 * Math.PI * pattern.speed
          const offsetX = Math.cos(angle) * pattern.radius
          const offsetY = Math.sin(angle) * pattern.radius

          return zone.coordinates.map(
            ([x, y]) =>
              [Math.max(0, Math.min(100, x + offsetX)), Math.max(0, Math.min(100, y + offsetY))] as [number, number],
          )
        }
        break

      case "linear":
        if (pattern.direction) {
          const progress = (timeInCycle / 40) % 2
          const direction = progress > 1 ? 2 - progress : progress
          const offsetX = pattern.direction[0] * direction * 25
          const offsetY = pattern.direction[1] * direction * 25

          return zone.coordinates.map(
            ([x, y]) =>
              [Math.max(0, Math.min(100, x + offsetX)), Math.max(0, Math.min(100, y + offsetY))] as [number, number],
          )
        }
        break

      case "random":
        const seed = Math.floor(timeInCycle / 8)
        const randomX = ((Math.sin(seed * 2.1) * pattern.speed * 20) % 20) - 10
        const randomY = ((Math.cos(seed * 1.9) * pattern.speed * 20) % 20) - 10

        return zone.coordinates.map(
          ([x, y]) =>
            [Math.max(0, Math.min(100, x + randomX)), Math.max(0, Math.min(100, y + randomY))] as [number, number],
        )
    }

    return zone.coordinates
  }

  // Mesafe hesaplama
  const calculateDistance = (pos1: [number, number], pos2: [number, number]): number => {
    return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2))
  }

  // Yasak bölge kontrolü
  const isInNoFlyZone = (pos: [number, number], time: number): boolean => {
    return noFlyZones.some((zone) => {
      if (time < zone.active_time[0] || time > zone.active_time[1]) return false

      const currentCoords = zone.is_dynamic ? getDynamicZoneCoordinates(zone, time) : zone.coordinates

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

  const drawVisualization = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Canvas boyutlarını ayarla
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const canvasWidth = rect.width
    const canvasHeight = rect.height

    // Temizle
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Grid çiz
    drawGrid(ctx, canvasWidth, canvasHeight)

    // Koordinat dönüşümü (100x100 grid -> canvas boyutu)
    const scaleX = (canvasWidth * zoom) / 100
    const scaleY = (canvasHeight * zoom) / 100

    // Transform uygula
    ctx.save()
    ctx.translate(offset.x, offset.y)

    // Yasak bölgeleri çiz
    drawNoFlyZones(ctx, scaleX, scaleY)

    // Rotaları çiz
    drawRoutes(ctx, scaleX, scaleY)

    // Teslimat noktalarını çiz
    drawDeliveries(ctx, scaleX, scaleY)

    // Drone'ları çiz
    drawDrones(ctx, scaleX, scaleY)

    ctx.restore()

    // Lejant çiz
    drawLegend(ctx, canvasWidth, canvasHeight)
  }

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "#f0f0f0"
    ctx.lineWidth = 1

    const gridSize = 20
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  const drawNoFlyZones = (ctx: CanvasRenderingContext2D, scaleX: number, scaleY: number) => {
    noFlyZones.forEach((zone, index) => {
      // Dinamik bölgeler için güncel koordinatları al
      const currentCoords = zone.is_dynamic ? getDynamicZoneCoordinates(zone, animationTime) : zone.coordinates

      ctx.fillStyle = zone.is_dynamic ? `rgba(255, 100, 100, 0.3)` : `rgba(255, 0, 0, 0.2)`
      ctx.strokeStyle = zone.is_dynamic ? "#ff6464" : "#ff0000"
      ctx.lineWidth = zone.is_dynamic ? 3 : 2

      ctx.beginPath()
      currentCoords.forEach((coord: [number, number], coordIndex: number) => {
        const x = coord[0] * scaleX
        const y = coord[1] * scaleY
        if (coordIndex === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Zone ID ve hareket tipi yazısı
      const centerX = (currentCoords.reduce((sum, coord) => sum + coord[0], 0) / currentCoords.length) * scaleX
      const centerY = (currentCoords.reduce((sum, coord) => sum + coord[1], 0) / currentCoords.length) * scaleY

      ctx.fillStyle = zone.is_dynamic ? "#ff6464" : "#ff0000"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`Yasak ${zone.id}`, centerX, centerY - 5)

      if (zone.is_dynamic) {
        ctx.font = "8px Arial"
        ctx.fillText(`${zone.movement_pattern?.type}`, centerX, centerY + 8)
      }
    })
  }

  const drawDeliveries = (ctx: CanvasRenderingContext2D, scaleX: number, scaleY: number) => {
    deliveries.forEach((delivery) => {
      const x = delivery.pos[0] * scaleX
      const y = delivery.pos[1] * scaleY

      // Öncelik rengine göre
      const priorityColors = ["#9CA3AF", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#DC2626"]
      const color = priorityColors[delivery.priority] || "#9CA3AF"

      // Teslimat tamamlandı mı?
      const isCompleted = completedDeliveries.has(delivery.id)

      // Dış halka (öncelik göstergesi)
      ctx.strokeStyle = isCompleted ? "#22c55e" : color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x, y, 12, 0, 2 * Math.PI)
      ctx.stroke()

      // İç daire
      ctx.fillStyle = isCompleted ? "#dcfce7" : "#ffffff"
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, 2 * Math.PI)
      ctx.fill()

      // ID yazısı
      ctx.fillStyle = isCompleted ? "#22c55e" : color
      ctx.font = "bold 10px Arial"
      ctx.textAlign = "center"
      ctx.fillText(delivery.id.toString(), x, y + 3)

      // Ağırlık bilgisi
      ctx.fillStyle = "#666666"
      ctx.font = "8px Arial"
      ctx.fillText(`${delivery.weight}kg`, x, y + 20)

      // Tamamlandı işareti
      if (isCompleted) {
        ctx.fillStyle = "#22c55e"
        ctx.font = "8px Arial"
        ctx.fillText("✓", x, y + 30)
      }
    })
  }

  const drawDrones = (ctx: CanvasRenderingContext2D, scaleX: number, scaleY: number) => {
    animatedDrones.forEach((drone) => {
      const x = drone.currentPos[0] * scaleX
      const y = drone.currentPos[1] * scaleY
      const color = drone.color

      // Drone gövdesi
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 15, 0, 2 * Math.PI)
      ctx.fill()

      // Drone çerçevesi
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Drone ID
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`D${drone.id}`, x, y + 4)

      // Yük bilgisi
      const loadPercentage = (drone.load / drone.maxWeight) * 100
      ctx.fillStyle = loadPercentage > 80 ? "#ef4444" : loadPercentage > 50 ? "#f59e0b" : "#22c55e"
      ctx.font = "8px Arial"
      ctx.fillText(`${drone.load.toFixed(1)}/${drone.maxWeight}kg`, x, y + 25)

      // Hareket durumu
      if (drone.isMoving) {
        // Hareket çizgisi
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(drone.targetPos[0] * scaleX, drone.targetPos[1] * scaleY)
        ctx.stroke()
        ctx.setLineDash([])

        // Hareket göstergesi
        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(x, y - 15, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
    })
  }

  const drawRoutes = (ctx: CanvasRenderingContext2D, scaleX: number, scaleY: number) => {
    animatedDrones.forEach((drone) => {
      if (drone.route.length === 0) return

      const color = drone.color

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])

      const currentPos = drones.find((d) => d.id === drone.id)?.start_pos || [0, 0]
      let currentX = currentPos[0] * scaleX
      let currentY = currentPos[1] * scaleY

      drone.route.forEach((deliveryId, index) => {
        const delivery = deliveries.find((d) => d.id === deliveryId)
        if (!delivery) return

        const nextX = delivery.pos[0] * scaleX
        const nextY = delivery.pos[1] * scaleY

        // Rota çizgisi (tamamlanmış kısımlar daha soluk)
        ctx.strokeStyle = index <= drone.currentRouteIndex ? `${color}80` : color
        ctx.beginPath()
        ctx.moveTo(currentX, currentY)
        ctx.lineTo(nextX, nextY)
        ctx.stroke()

        // Sıra numarası
        const midX = (currentX + nextX) / 2
        const midY = (currentY + nextY) / 2

        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(midX, midY, 8, 0, 2 * Math.PI)
        ctx.fill()

        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = index <= drone.currentRouteIndex ? `${color}80` : color
        ctx.font = "bold 8px Arial"
        ctx.textAlign = "center"
        ctx.fillText((index + 1).toString(), midX, midY + 2)

        currentX = nextX
        currentY = nextY
      })

      ctx.setLineDash([])
    })
  }

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
  ) => {
    const headLength = 10
    const angle = Math.atan2(toY - fromY, toX - fromX)

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 2

    // Ok başı
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()
  }

  const drawLegend = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const legendWidth = 200
    const legendHeight = 180
    const legendX = width - legendWidth - 10
    const legendY = 10

    // Lejant arka planı
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight)
    ctx.strokeStyle = "#cccccc"
    ctx.lineWidth = 1
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight)

    ctx.fillStyle = "#333333"
    ctx.font = "bold 12px Arial"
    ctx.textAlign = "left"
    ctx.fillText("Lejant", legendX + 10, legendY + 20)

    let yPos = legendY + 35

    // Drone lejantı
    ctx.fillStyle = droneColors[0]
    ctx.beginPath()
    ctx.arc(legendX + 15, yPos, 8, 0, 2 * Math.PI)
    ctx.fill()
    ctx.fillStyle = "#333333"
    ctx.font = "10px Arial"
    ctx.fillText("Drone", legendX + 30, yPos + 3)

    yPos += 20

    // Teslimat lejantı
    ctx.strokeStyle = "#EF4444"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(legendX + 15, yPos, 8, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = "#333333"
    ctx.fillText("Teslimat Noktası", legendX + 30, yPos + 3)

    yPos += 20

    // Tamamlanmış teslimat lejantı
    ctx.strokeStyle = "#22c55e"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(legendX + 15, yPos, 8, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = "#dcfce7"
    ctx.beginPath()
    ctx.arc(legendX + 15, yPos, 6, 0, 2 * Math.PI)
    ctx.fill()
    ctx.fillStyle = "#333333"
    ctx.fillText("Tamamlanmış Teslimat", legendX + 30, yPos + 3)

    yPos += 20

    // Yasak bölge lejantı
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
    ctx.fillRect(legendX + 10, yPos - 5, 10, 10)
    ctx.strokeStyle = "#ff0000"
    ctx.lineWidth = 1
    ctx.strokeRect(legendX + 10, yPos - 5, 10, 10)
    ctx.fillStyle = "#333333"
    ctx.fillText("Yasak Bölge", legendX + 30, yPos + 3)

    yPos += 20

    // Dinamik yasak bölge lejantı
    ctx.fillStyle = "rgba(255, 100, 100, 0.3)"
    ctx.fillRect(legendX + 10, yPos - 5, 10, 10)
    ctx.strokeStyle = "#ff6464"
    ctx.lineWidth = 2
    ctx.strokeRect(legendX + 10, yPos - 5, 10, 10)
    ctx.fillStyle = "#333333"
    ctx.fillText("Dinamik Yasak Bölge", legendX + 30, yPos + 3)

    yPos += 20

    // Rota lejantı
    ctx.strokeStyle = droneColors[0]
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.moveTo(legendX + 10, yPos)
    ctx.lineTo(legendX + 20, yPos)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = "#333333"
    ctx.fillText("Rota", legendX + 30, yPos + 3)

    yPos += 20

    // Öncelik renkleri
    ctx.font = "8px Arial"
    ctx.fillText("Öncelik Seviyeleri:", legendX + 10, yPos)
    yPos += 12

    const priorityColors = ["#9CA3AF", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"]
    priorityColors.forEach((color, index) => {
      if (index < 5) {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(legendX + 15 + index * 25, yPos, 4, 0, 2 * Math.PI)
        ctx.fill()
        ctx.fillStyle = "#333333"
        ctx.font = "6px Arial"
        ctx.textAlign = "center"
        ctx.fillText((index + 1).toString(), legendX + 15 + index * 25, yPos + 10)
      }
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - lastMousePos.x
    const deltaY = e.clientY - lastMousePos.y

    setOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }))

    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 0.5))
  }

  const handleReset = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const changeSpeed = () => {
    setAnimationSpeed((prev) => (prev >= 2 ? 0.5 : prev + 0.5))
  }

  const resetSimulation = () => {
    setAnimationTime(0)
    initializeDrones()
  }

  return (
    <div className="space-y-4">
      {/* Kontrol Paneli */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={handleZoomIn} size="sm" variant="outline">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button onClick={handleZoomOut} size="sm" variant="outline">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button onClick={handleReset} size="sm" variant="outline">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Animasyon Kontrolleri */}
        <div className="flex gap-2">
          <Button onClick={togglePlayPause} size="sm" variant={isPlaying ? "default" : "outline"}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button onClick={changeSpeed} size="sm" variant="outline">
            <FastForward className="h-4 w-4" />
            <span className="ml-1">{animationSpeed}x</span>
          </Button>
          <Button onClick={resetSimulation} size="sm" variant="outline">
            <RotateCcw className="h-4 w-4" />
            <span className="ml-1">Sıfırla</span>
          </Button>
        </div>

        {/* Durum Bilgisi */}
        <div className="flex gap-2">
          <Badge variant="outline">Zoom: {(zoom * 100).toFixed(0)}%</Badge>
          <Badge variant="outline">Zaman: {animationTime.toFixed(1)}dk</Badge>
          <Badge variant="success">
            Tamamlanan: {completedDeliveries.size}/{deliveries.length}
          </Badge>
        </div>
      </div>

      {/* Canvas */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-96 cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Bilgi Paneli */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{drones.length}</div>
              <div className="text-sm text-gray-600">Aktif Drone</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{deliveries.length}</div>
              <div className="text-sm text-gray-600">Teslimat Noktası</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{noFlyZones.length}</div>
              <div className="text-sm text-gray-600">Yasak Bölge</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
