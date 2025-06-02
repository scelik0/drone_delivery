// A* Algoritması Implementasyonu
export class AStarAlgorithm {
  constructor(drones, deliveries, noFlyZones) {
    this.drones = drones
    this.deliveries = deliveries
    this.noFlyZones = noFlyZones
  }

  calculateDistance(pos1, pos2) {
    return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2))
  }

  isInNoFlyZone(pos, time) {
    return this.noFlyZones.some((zone) => {
      if (time < zone.active_time[0] || time > zone.active_time[1]) return false

      const x = pos[0],
        y = pos[1]
      let inside = false
      const coords = zone.coordinates

      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        if (
          coords[i][1] > y !== coords[j][1] > y &&
          x < ((coords[j][0] - coords[i][0]) * (y - coords[i][1])) / (coords[j][1] - coords[i][1]) + coords[i][0]
        ) {
          inside = !inside
        }
      }
      return inside
    })
  }

  heuristic(currentPos, targetPos, priority) {
    const distance = this.calculateDistance(currentPos, targetPos)
    const priorityBonus = (6 - priority) * 5
    return distance + priorityBonus
  }

  findOptimalRoute() {
    const routes = {}
    const assignedDeliveries = new Set()
    let totalDistance = 0
    let energyConsumption = 0

    // Öncelik sırasına göre teslimatları sırala
    const sortedDeliveries = [...this.deliveries].sort((a, b) => b.priority - a.priority)

    // Her drone için başlangıç durumu
    const droneStates = this.drones.map((drone) => ({
      ...drone,
      currentPos: drone.start_pos,
      currentLoad: 0,
      currentTime: 0,
    }))

    for (const delivery of sortedDeliveries) {
      if (assignedDeliveries.has(delivery.id)) continue

      let bestDrone = null
      let bestCost = Number.POSITIVE_INFINITY

      for (const drone of droneStates) {
        // Kapasite kontrolü
        if (drone.currentLoad + delivery.weight > drone.max_weight) continue

        // Zaman penceresi kontrolü
        const travelTime = this.calculateDistance(drone.currentPos, delivery.pos) / drone.speed
        const arrivalTime = drone.currentTime + travelTime

        if (arrivalTime > delivery.time_window[1]) continue

        // Yasak bölge kontrolü
        if (this.isInNoFlyZone(delivery.pos, arrivalTime)) continue

        // A* heuristik maliyeti
        const cost = this.heuristic(drone.currentPos, delivery.pos, delivery.priority)

        if (cost < bestCost) {
          bestCost = cost
          bestDrone = drone
        }
      }

      if (bestDrone) {
        if (!routes[bestDrone.id]) routes[bestDrone.id] = []
        routes[bestDrone.id].push(delivery.id)

        const distance = this.calculateDistance(bestDrone.currentPos, delivery.pos)
        totalDistance += distance
        energyConsumption += distance * delivery.weight * 0.1

        // Drone durumunu güncelle
        bestDrone.currentPos = delivery.pos
        bestDrone.currentLoad += delivery.weight
        bestDrone.currentTime += distance / bestDrone.speed

        assignedDeliveries.add(delivery.id)
      }
    }

    return {
      routes,
      totalDistance,
      completedDeliveries: assignedDeliveries.size,
      energyConsumption,
    }
  }
}

// CSP Algoritması Implementasyonu
export class CSPAlgorithm {
  constructor(drones, deliveries, noFlyZones) {
    this.drones = drones
    this.deliveries = deliveries
    this.noFlyZones = noFlyZones
    this.variables = deliveries.map((d) => d.id)
    this.domains = {}
    this.constraints = []

    this.initializeDomains()
    this.initializeConstraints()
  }

  initializeDomains() {
    this.variables.forEach((deliveryId) => {
      const delivery = this.deliveries.find((d) => d.id === deliveryId)
      this.domains[deliveryId] = this.drones
        .filter((drone) => drone.max_weight >= delivery.weight)
        .map((drone) => drone.id)
    })
  }

  initializeConstraints() {
    // Kapasite kısıtı
    this.constraints.push({
      type: "capacity",
      check: (assignment) => {
        const droneLoads = {}

        Object.entries(assignment).forEach(([deliveryId, droneId]) => {
          const delivery = this.deliveries.find((d) => d.id === Number.parseInt(deliveryId))
          droneLoads[droneId] = (droneLoads[droneId] || 0) + delivery.weight
        })

        return Object.entries(droneLoads).every(([droneId, load]) => {
          const drone = this.drones.find((d) => d.id === Number.parseInt(droneId))
          return load <= drone.max_weight
        })
      },
    })

    // Zaman penceresi kısıtı
    this.constraints.push({
      type: "time_window",
      check: (assignment) => {
        const droneSchedules = {}

        Object.entries(assignment).forEach(([deliveryId, droneId]) => {
          if (!droneSchedules[droneId]) droneSchedules[droneId] = []
          droneSchedules[droneId].push(Number.parseInt(deliveryId))
        })

        return Object.entries(droneSchedules).every(([droneId, deliveryIds]) => {
          const drone = this.drones.find((d) => d.id === Number.parseInt(droneId))
          let currentTime = 0
          let currentPos = drone.start_pos

          return deliveryIds.every((deliveryId) => {
            const delivery = this.deliveries.find((d) => d.id === deliveryId)
            const travelTime = this.calculateDistance(currentPos, delivery.pos) / drone.speed
            currentTime += travelTime
            currentPos = delivery.pos

            return currentTime >= delivery.time_window[0] && currentTime <= delivery.time_window[1]
          })
        })
      },
    })
  }

  calculateDistance(pos1, pos2) {
    return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2))
  }

  isConsistent(assignment) {
    return this.constraints.every((constraint) => constraint.check(assignment))
  }

  backtrackSearch() {
    const assignment = {}

    const backtrack = (index) => {
      if (index === this.variables.length) {
        return this.isConsistent(assignment)
      }

      const variable = this.variables[index]

      for (const value of this.domains[variable]) {
        assignment[variable] = value

        if (this.isConsistent(assignment)) {
          if (backtrack(index + 1)) {
            return true
          }
        }

        delete assignment[variable]
      }

      return false
    }

    if (backtrack(0)) {
      return this.convertToRoutes(assignment)
    }

    return null
  }

  convertToRoutes(assignment) {
    const routes = {}
    let totalDistance = 0
    let energyConsumption = 0

    Object.entries(assignment).forEach(([deliveryId, droneId]) => {
      if (!routes[droneId]) routes[droneId] = []
      routes[droneId].push(Number.parseInt(deliveryId))
    })

    // Mesafe ve enerji hesapla
    Object.entries(routes).forEach(([droneId, deliveryIds]) => {
      const drone = this.drones.find((d) => d.id === Number.parseInt(droneId))
      let currentPos = drone.start_pos

      deliveryIds.forEach((deliveryId) => {
        const delivery = this.deliveries.find((d) => d.id === deliveryId)
        const distance = this.calculateDistance(currentPos, delivery.pos)
        totalDistance += distance
        energyConsumption += distance * delivery.weight * 0.1
        currentPos = delivery.pos
      })
    })

    return {
      routes,
      totalDistance,
      completedDeliveries: Object.keys(assignment).length,
      energyConsumption,
    }
  }

  solve() {
    return this.backtrackSearch()
  }
}

// Genetik Algoritma Implementasyonu
export class GeneticAlgorithm {
  constructor(drones, deliveries, noFlyZones, options = {}) {
    this.drones = drones
    this.deliveries = deliveries
    this.noFlyZones = noFlyZones

    this.populationSize = options.populationSize || 50
    this.generations = options.generations || 100
    this.mutationRate = options.mutationRate || 0.1
    this.crossoverRate = options.crossoverRate || 0.8
    this.elitismRate = options.elitismRate || 0.2
  }

  calculateDistance(pos1, pos2) {
    return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2))
  }

  createRandomChromosome() {
    return this.deliveries.map((delivery) => {
      const validDrones = this.drones.filter((drone) => drone.max_weight >= delivery.weight)
      return validDrones.length > 0 ? validDrones[Math.floor(Math.random() * validDrones.length)].id : this.drones[0].id
    })
  }

  calculateFitness(chromosome) {
    const droneRoutes = {}
    const droneLoads = {}
    let fitness = 0
    let violations = 0

    // Rotaları oluştur
    chromosome.forEach((droneId, index) => {
      const delivery = this.deliveries[index]

      if (!droneRoutes[droneId]) droneRoutes[droneId] = []
      droneRoutes[droneId].push(delivery)

      const currentLoad = droneLoads[droneId] || 0
      const drone = this.drones.find((d) => d.id === droneId)

      // Kapasite ihlali
      if (currentLoad + delivery.weight > drone.max_weight) {
        violations += 100
      } else {
        droneLoads[droneId] = currentLoad + delivery.weight
        fitness += delivery.priority * 10 // Öncelik bonusu
      }
    })

    // Mesafe ve zaman cezaları
    Object.entries(droneRoutes).forEach(([droneId, deliveries]) => {
      const drone = this.drones.find((d) => d.id === Number.parseInt(droneId))
      let currentPos = drone.start_pos
      let currentTime = 0

      deliveries.forEach((delivery) => {
        const distance = this.calculateDistance(currentPos, delivery.pos)
        const travelTime = distance / drone.speed

        currentTime += travelTime
        currentPos = delivery.pos

        // Mesafe cezası
        fitness -= distance * 0.5

        // Zaman penceresi ihlali
        if (currentTime < delivery.time_window[0] || currentTime > delivery.time_window[1]) {
          violations += 50
        }

        // Enerji tüketimi
        fitness -= distance * delivery.weight * 0.01
      })
    })

    return Math.max(0, fitness - violations)
  }

  selection(population, fitnessScores) {
    // Tournament selection
    const tournamentSize = 3
    const selected = []

    for (let i = 0; i < population.length; i++) {
      let best = Math.floor(Math.random() * population.length)

      for (let j = 1; j < tournamentSize; j++) {
        const competitor = Math.floor(Math.random() * population.length)
        if (fitnessScores[competitor] > fitnessScores[best]) {
          best = competitor
        }
      }

      selected.push([...population[best]])
    }

    return selected
  }

  crossover(parent1, parent2) {
    if (Math.random() > this.crossoverRate) {
      return [parent1, parent2]
    }

    const crossoverPoint = Math.floor(Math.random() * parent1.length)
    const child1 = [...parent1.slice(0, crossoverPoint), ...parent2.slice(crossoverPoint)]
    const child2 = [...parent2.slice(0, crossoverPoint), ...parent1.slice(crossoverPoint)]

    return [child1, child2]
  }

  mutate(chromosome) {
    return chromosome.map((gene, index) => {
      if (Math.random() < this.mutationRate) {
        const delivery = this.deliveries[index]
        const validDrones = this.drones.filter((drone) => drone.max_weight >= delivery.weight)
        return validDrones.length > 0 ? validDrones[Math.floor(Math.random() * validDrones.length)].id : gene
      }
      return gene
    })
  }

  evolve() {
    // İlk popülasyonu oluştur
    let population = Array.from({ length: this.populationSize }, () => this.createRandomChromosome())

    for (let generation = 0; generation < this.generations; generation++) {
      // Fitness hesapla
      const fitnessScores = population.map((chromosome) => this.calculateFitness(chromosome))

      // Elitism - en iyileri koru
      const sortedIndices = fitnessScores
        .map((fitness, index) => ({ fitness, index }))
        .sort((a, b) => b.fitness - a.fitness)
        .map((item) => item.index)

      const eliteCount = Math.floor(this.populationSize * this.elitismRate)
      const newPopulation = []

      // En iyileri koru
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push([...population[sortedIndices[i]]])
      }

      // Seçim, çaprazlama ve mutasyon
      const selected = this.selection(population, fitnessScores)

      while (newPopulation.length < this.populationSize) {
        const parent1 = selected[Math.floor(Math.random() * selected.length)]
        const parent2 = selected[Math.floor(Math.random() * selected.length)]

        const [child1, child2] = this.crossover(parent1, parent2)

        newPopulation.push(this.mutate(child1))
        if (newPopulation.length < this.populationSize) {
          newPopulation.push(this.mutate(child2))
        }
      }

      population = newPopulation
    }

    // En iyi çözümü döndür
    const finalFitnessScores = population.map((chromosome) => this.calculateFitness(chromosome))
    const bestIndex = finalFitnessScores.indexOf(Math.max(...finalFitnessScores))

    return this.convertToRoutes(population[bestIndex])
  }

  convertToRoutes(chromosome) {
    const routes = {}
    let totalDistance = 0
    let energyConsumption = 0

    chromosome.forEach((droneId, index) => {
      const delivery = this.deliveries[index]
      if (!routes[droneId]) routes[droneId] = []
      routes[droneId].push(delivery.id)
    })

    // Mesafe ve enerji hesapla
    Object.entries(routes).forEach(([droneId, deliveryIds]) => {
      const drone = this.drones.find((d) => d.id === Number.parseInt(droneId))
      let currentPos = drone.start_pos

      deliveryIds.forEach((deliveryId) => {
        const delivery = this.deliveries.find((d) => d.id === deliveryId)
        const distance = this.calculateDistance(currentPos, delivery.pos)
        totalDistance += distance
        energyConsumption += distance * delivery.weight * 0.1
        currentPos = delivery.pos
      })
    })

    return {
      routes,
      totalDistance,
      completedDeliveries: chromosome.length,
      energyConsumption,
    }
  }
}
