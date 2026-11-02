let canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let ctx = canvas.getContext("2d");

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

function background(color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;   
    }

    difference(a) {
        return new Vector(a.x-this.x, a.y-this.y);
    }

    sum(a) {
        return new Vector(a.x+this.x, a.y+this.y);
    }
    
    draw(color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, 2*Math.PI);        
        ctx.closePath();
        ctx.fill();        
    }
}

class Vector extends Point{
    constructor(x, y) {
        super(x, y);  
    } 

    magnitude() {
        return Math.sqrt(this.x**2 + this.y**2);
    }

    angle() {
        let angle = Math.atan2(this.y, this.x);
        if (angle < 0) {
            angle += 2 * Math.PI;
        }
        return angle;
    }

    scale(s) {
        return new Vector(this.x*s, this.y*s);
    }

    normal() {
        return this.scale(1/this.magnitude());
    }

    dotProduct(a) {
        return this.x * a.x + this.y * a.y;
    }

    draw(coordinate, color) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(coordinate.x, coordinate.y);
        ctx.lineTo(coordinate.x+this.x, coordinate.y+this.y);
        ctx.closePath();
        ctx.stroke();
    }
}

class Connection {
    constructor(radius, startAngle, endAngle, node) {
        this.radius = radius;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
        this.node = node;
    }

    constrain(node) {
        let r = node.coordinate.difference(this.node.coordinate);

        if(r.magnitude() !== this.radius) {
            let result = this.node.coordinate.sum(r.scale((this.radius-r.magnitude())/r.magnitude()));
            this.node.coordinate = new Point(result.x, result.y);
        }
        
        let relativeAngle  = r.angle() - node.direction.angle();

        if(relativeAngle < 0) {
            relativeAngle = 2 * Math.PI + relativeAngle;
        }
        
        if(relativeAngle < this.startAngle || relativeAngle > this.endAngle) {
            let differenceStart  = Math.abs(relativeAngle - this.startAngle);
            let differenceEnd    = Math.abs(this.endAngle - relativeAngle);
            
            let distanceToStart = Math.min(differenceStart, 2*Math.PI - differenceStart);
            let distanceToEnd   = Math.min(differenceEnd, 2*Math.PI - differenceEnd);
            
            if(distanceToStart <= distanceToEnd) {
                let result = new Vector(Math.cos(this.startAngle + node.direction.angle()),
                                        Math.sin(this.startAngle + node.direction.angle()))
                                        .scale(this.radius)
                                        .sum(node.coordinate);
                this.node.coordinate = new Point(result.x, result.y);
            }
            else {
                let result = new Vector(Math.cos(this.endAngle + node.direction.angle()),
                                        Math.sin(this.endAngle + node.direction.angle()))
                                        .scale(this.radius)
                                        .sum(node.coordinate);
                this.node.coordinate = new Point(result.x, result.y);
            }
        }
        

        this.node.direction = this.node.coordinate.difference(node.coordinate).normal();

        this.node.constrain();
    }
}

class Node {
    constructor(coordinate, direction, connections, groups) {
        this.coordinate = coordinate;
        this.direction = direction;
        this.connections = connections;
        this.groups = groups;
    }

    constrain() {
        this.connections.forEach(connection => {
            connection.constrain(this);
        });
    }

    *traverse(link = null, depth = 0) {
        yield { node: this, link, depth };

        for (const connection of this.connections) {
            const child = connection.node;
            const childLink = { parent: this, connection };

            yield* child.traverse(childLink, depth + 1);
        }
    }
}

class Brain {
    constructor ({dx = 0.5, M = 16, size = 200, speed = 100} = {}) {
        this.coordinate = new Point(0, 0);

        this.dx = dx;
        this.M = M;

        this.W = 2 * Math.PI / this.dx;
        this.scale = size / Math.sqrt(this.dx);
        this.timeScale = speed / size / 1000;
        this.std = Math.sqrt(0.5 / this.M);

        this.modes = Array.from({ length: this.M }, () => ({
            w: (Math.random() * 2 - 1) * this.W,
            a: this.randn() * this.std,
            b: this.randn() * this.std,
        }));
    }

    randn() {
        return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
    }

    smooth_random_walk(t) {
        let s = t * this.timeScale;
        let x = 0, y = 0;
        for (let m of this.modes) {
            let u = Math.sin(m.w * s) / m.w;
            let v = (1 - Math.cos(m.w * s)) / m.w;
            x += m.a * u - m.b * v;
            y += m.a * v + m.b * u;
        }
        this.coordinate.x = x * this.scale;
        this.coordinate.y = y * this.scale;
    }

    draw() {
        this.coordinate.draw("rgb(0,255,0)");
    }
}

class Brain2 {
    constructor({ size = 250, waves = 3, minSpeed = 0.1, maxSpeed = 0.5 } = {}) {
        this.coordinate = new Point(0, 0);
        this.size = size;

        const makeWaves = () => Array.from({ length: waves }, () => ({
            speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
            phase: Math.random() * 2 * Math.PI,
        }));

        this.wavesX = makeWaves();
        this.wavesY = makeWaves();
    }

    sum(waves, s) {
        let total = 0;
        for (const w of waves) total += Math.sin(s * w.speed + w.phase);
        return total / waves.length; // keeps the result within [-1, 1]
    }

    smooth_random_walk(t) {
        const s = t / 1000;
        this.coordinate.x = this.sum(this.wavesX, s) * this.size;
        this.coordinate.y = this.sum(this.wavesY, s) * this.size;
    }

    draw() {
        this.coordinate.draw("rgb(0,255,0)");
    }
}

//Rig Functions
function createLeg(groups, length, startRadius, endRadius) {
    if(length <= 1) {
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(startRadius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], groups)),
            new Connection(startRadius, (2/2)*Math.PI, (2/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], groups)), 
            new Connection(startRadius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], groups))
        ], []);
    }

    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(startRadius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], groups)), 
        new Connection(20, (5/6)*Math.PI, (7/6)*Math.PI, createLeg(groups, length-1, startRadius + (endRadius-startRadius) / (length - 1), endRadius)), 
        new Connection(startRadius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], groups))
    ], []);
}  

function createFishRightFin() {
    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(0, 0, 0, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightFinEdge"])),
        new Connection(30, (7/6)*Math.PI, (8/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightFinEdge"])),
        new Connection(30, (15/12)*Math.PI, (9/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightFinEdge"])),
        new Connection(0, 2*Math.PI, 2*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightFinEdge"]))
    ], ["all", "rightFin"]);
}

function createFishLeftFin() {
    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(0, 0, 0, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftFinEdge"])),
        new Connection(30, (3/6)*Math.PI, (11/12)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftFinEdge"])),
        new Connection(30, (4/6)*Math.PI, (5/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftFinEdge"])),
        new Connection(0, 2*Math.PI, 2*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftFinEdge"]))
    ], ["all", "leftFin"]);
}

function createFishTailFin() {
    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(0, 0, 0, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "tailFinEdge"])),
        new Connection(50, (5/6)*Math.PI, (89/90)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "tailFinEdge"])),
        new Connection(50, (91/90)*Math.PI, (7/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "tailFinEdge"])),
        new Connection(0, 2*Math.PI, 2*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "tailFinEdge"]))
    ], ["all", "tailFin"]);
}

function createFishBody(length, midpoint, position, startRadius, middleRadius, endRadius) {
    if(position == length-1) {
        const radius = endRadius;
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightBodyEdge"])),
            new Connection(radius, Math.PI, Math.PI, createFishTailFin()),
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftBodyEdge"]))
        ], ["all", "spine"]);
    }

    if(position == 0) {
        const radius = startRadius;
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightBodyEdge", "rightHeadEdge"])),
            new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(length, midpoint, position + 1, startRadius, middleRadius, endRadius)),
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftBodyEdge", "leftHeadEdge"]))
        ], ["all", "spine"]);
    }
    
    if(position < midpoint) {
        const radius = startRadius + position * (middleRadius-startRadius)/(midpoint);
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightBodyEdge"])),
            new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(length, midpoint, position + 1, startRadius, middleRadius, endRadius)), 
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftBodyEdge"]))
        ], ["all", "spine"]);
    }

    if(position == midpoint) {
        const radius = middleRadius;
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, createFishRightFin()),

            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightBodyEdge"])),
            new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(length, midpoint, position + 1, startRadius, middleRadius, endRadius)), 
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftBodyEdge"])),

            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, createFishLeftFin()),
        ], ["all", "spine"]);
    }

    if(position > midpoint) {
        const radius = middleRadius + (position - midpoint) * (endRadius-middleRadius)/(length-midpoint);
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightBodyEdge"])),
            new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(length, midpoint, position + 1, startRadius, middleRadius, endRadius)), 
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftBodyEdge"]))
        ], ["all", "spine"]);
    }
}

function createFishHead() {
    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(20, 0, 0, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        new Connection(20, (1/6)*Math.PI, (1/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        new Connection(20, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(12, 2, 0, 25, 30, 5)),
        new Connection(20, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"])),
        new Connection(20, (11/6)*Math.PI, (11/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"])),
        new Connection(20, 2*Math.PI, 2*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"]))
    ], ["all", "head"]);
}

function createFish() {
    return new Node(new Point(0, 0), new Vector(1, 0), [new Connection(20, (0/6)*Math.PI, (12/6)*Math.PI, createFishHead())], ["all"])
}

//Texture Functions

//Final Texures
function interpolatePoints(points, n, tau) {
    points = points.map(e => new Vector(e.x, e.y))
    const result = [];

    const first = points[0];
    const last = points[points.length - 1];
    const p = [
        points[1].difference(first.scale(2)),
        ...points,
        points[points.length - 2].difference(last.scale(2))
    ];


    for (let i = 1; i < p.length - 2; i++) {
        const p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];

        const P = (t) => {
            const c0 = p1
            let c1 = p0.difference(p2).scale(tau);
            let c2 = p1.difference(p2).scale(3).sum(p1.difference(p3).scale(-1*tau)).sum(p0.difference(p2).scale(-2*tau));
            let c3 = p1.difference(p2).scale(-2).sum(p1.difference(p3).scale(tau)).sum(p0.difference(p2).scale(tau))
            
            return c0.sum(c1.scale(t)).sum(c2.scale(t*t)).sum(c3.scale(t*t*t));
        }

        for (let i = 0; i <= n; i++) {
            result.push(P(i/(n+1)));
        }
    }

  result.push(last);
  return result.map(e => new Point(e.x, e.y));
}

function tracePath(points, samples, tau) {
    const smooth = interpolatePoints(points, samples, tau);
    ctx.beginPath();
    ctx.moveTo(smooth[0].x, smooth[0].y);
    for (let i = 1; i < smooth.length; i++) {
        ctx.lineTo(smooth[i].x, smooth[i].y);
    }
}

function drawSmoothCurve(points, {color = "rgb(255, 255, 255)", tension = 1, samples = 8} = {}) {
    tracePath(points, samples, 0.5 * tension);
    ctx.strokeStyle = color;
    ctx.stroke();
}

function drawFilledArea(points, {color = "rgb(255, 255, 255)", tension = 1, samples = 8} = {}) {
    tracePath(points, samples, 0.5 * tension);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

function drawScale(p1, p2, color) {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = distance / 2;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    const startAngle = Math.atan2(dy, dx);
    const endAngle = Math.atan2(-dy, -dx);
    ctx.arc(midX, midY, radius, startAngle, endAngle, true);
    //ctx.fill();
    ctx.stroke();
}

function drawFishBody(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;

    const perimeter = get("rightBodyEdge").map(e => e.coordinate).concat(get("tailFin").map(e => e.coordinate)).concat(get("leftBodyEdge").map(e => e.coordinate))
    //drawFilledArea(perimeter, {color: "rgb(250, 250, 250)"});
    drawSmoothCurve(perimeter, {color: "rgb(255, 64, 0)"});

    let rightPoints = interpolatePoints(get("rightBodyEdge").map(e => e.coordinate), 2, 0.5);
    let middlePoints = interpolatePoints(get("spine").map(e => e.coordinate), 2, 0.5);
    let leftPoints = interpolatePoints(get("leftBodyEdge").map(e => e.coordinate), 2, 0.5);
    
    let pointMatrix = [];

    for(let i = 0; i < middlePoints.length; i++) {
        if(i%2 == 0) {
            pointMatrix.push(interpolatePoints([rightPoints[i], middlePoints[i], leftPoints[middlePoints.length - i - 1]], 1, 0.5));
        }
        else {
            const p = interpolatePoints([rightPoints[i], middlePoints[i], leftPoints[middlePoints.length - i - 1]], 3, 0.5)
            let newPoints = [];
            for(let j = 0; j < p.length; j++) {
                if(j%2 == 1) { newPoints.push(p[j]); }
            }
            pointMatrix.push(newPoints);
        }
    }

    for(let i = 0; i < pointMatrix.length; i++) {
        for(let j = 0; j < pointMatrix[i].length-1; j++) {
            const p1 = pointMatrix[i][j];
            const p2 = pointMatrix[i][j+1];

            drawScale(p1, p2, `rgb(255, ${128+64*i/pointMatrix.length}, 0)`);

            //pointMatrix[i].forEach(e => e.draw(`rgb(255, ${64+64*i/pointMatrix.length}, 0)`));
        }
    }
}

function drawFishRightFin(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;
    drawSmoothCurve(get("rightFinEdge").map(e => e.coordinate), {color: "rgb(255, 0, 0)"});
    //get("rightFin").forEach(e => drawConnectionArc(e));
}
function drawFishLeftFin(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;
    drawSmoothCurve(get("leftFinEdge").map(e => e.coordinate), {color: "rgb(0, 0, 255)"});
    //get("leftFin").forEach(e => drawConnectionArc(e));
}
function drawFishTailFin(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;
    drawSmoothCurve(get("tailFinEdge").map(e => e.coordinate), {color: "rgb(0, 255, 0)"});
    //get("tailFin").forEach(e => drawConnectionArc(e));
}

function drawFishHead(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;
    drawSmoothCurve(get("leftHeadEdge").map(e => e.coordinate), {color: "rgb(255, 255, 0)"});
    drawSmoothCurve(get("rightHeadEdge").map(e => e.coordinate), {color: "rgb(255, 255, 0)"});
    //get("head").forEach(e => drawConnectionArc(e));
}

//Debug Textures
function drawConnectionArc(node, {color = "rgb(255, 255, 255)"} = {}) {
    const base = node.direction.angle();
    node.connections.forEach(connection => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(node.coordinate.x, node.coordinate.y);
        ctx.arc(node.coordinate.x, node.coordinate.y, connection.radius,
                connection.startAngle + base, connection.endAngle + base);
        ctx.closePath();
        ctx.stroke();
    });
}

function drawAngleLimits(node) {
    const base = node.direction.angle();
    const at = (r, a) => new Point(
        node.coordinate.x + Math.cos(a + base) * r,
        node.coordinate.y + Math.sin(a + base) * r
    );
    node.connections.forEach(connection => {
        at(connection.radius, connection.startAngle).draw("rgb(255, 0, 0)");
        at(connection.radius, connection.endAngle).draw("rgb(0, 0, 255)");
    });
}

function drawNodeFrame(node, {coordinateColor = "rgb(255, 255, 255)", directionColor = "rgb(255, 255, 255)"} = {}) {
    node.coordinate.draw(coordinateColor);
    node.direction.scale(10).draw(node.coordinate, directionColor);
}

//root = new Node(new Point(100, 100), new Vector(1, 0), [new Connection(30, (0/6)*Math.PI, (0/6)*Math.PI, createLeg(10, 10, 1))]);
//root = createLeg(100, 10, 5);
let root = new Node(new Point(0, 0), new Vector(1, 0), [
    new Connection(30, (0/8)*Math.PI, (1/8)*Math.PI, createLeg(["all", "one"], 10, 10, 1)),
    new Connection(30, (2/8)*Math.PI, (3/8)*Math.PI, createLeg(["all", "two"], 10, 10, 1)),
    new Connection(30, (4/8)*Math.PI, (5/8)*Math.PI, createLeg(["all", "three"], 10, 10, 1)),
    new Connection(30, (6/8)*Math.PI, (7/8)*Math.PI, createLeg(["all", "four"], 10, 10, 1)),
    new Connection(30, (8/8)*Math.PI, (9/8)*Math.PI, createLeg(["all", "five"], 10, 10, 1)),
    new Connection(30, (10/8)*Math.PI, (11/8)*Math.PI, createLeg(["all", "six"], 10, 10, 1)),
    new Connection(30, (12/8)*Math.PI, (13/8)*Math.PI, createLeg(["all", "seven"], 10, 10, 1)),
    new Connection(30, (14/8)*Math.PI, (15/8)*Math.PI, createLeg(["all", "eight"], 10, 10, 1))
], []);

let brain = new Brain();

let fish = createFish();

let fishBrain = new Brain2();

let start = performance.now();

let mouse = new Point(1, 1);

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left - canvas.width / 2;
    mouse.y = event.clientY - rect.top - canvas.height / 2;
});

function update(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    background('rgb(0, 0, 0)');

    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    let t = (now - start);

    /*
    brain.smooth_random_walk(t);
    //root.coordinate = brain.coordinate;
    root.coordinate = mouse;
    root.constrain();

    
    const points = [];
    for (const { node } of root.traverse()) {
        if (node.groups.length) points.push({ groups: node.groups, coordinate: node.coordinate });
    }

    const groups = [
        {group: "all", color: "rgb(255, 255, 255)"}, 
        {group: "one", color: "rgb(255, 0, 0)"}, 
        {group: "two", color: "rgb(255, 128, 0)"}, 
        {group: "three", color: "rgb(255, 255, 0)"}, 
        {group: "four", color: "rgb(128, 255, 0)"}, 
        {group: "five", color: "rgb(0, 255, 128)"}, 
        {group: "six", color: "rgb(0, 255, 255)"}, 
        {group:"seven", color: "rgb(0, 0, 255)"}, 
        {group: "eight", color: "rgb(128, 0, 255)"},
        {group: "nine", color: "rgb(255, 0, 255)"}

    ];

    groups.forEach(g => {
        drawSmoothCurve(points.filter(e => e.groups.includes(g.group)).map(e => e.coordinate), {color: g.color});
    });

    for (const { node, link } of root.traverse()) {
        //if (link) drawAngleLimits(link.parent, link.conection);
        //if (link) drawConnectionArc(link.parent, link.conection);
        //drawNodeFrame(node);
    }
    */
    
    fishBrain.smooth_random_walk(t);
    fish.coordinate = mouse;
    fish.constrain();

    const nodes = [];
    for (const { node } of fish.traverse()) {
        nodes.push(node);
    }

    /*
    const textures = [       
        {group: "all",          draw: (nodes) => { 
            //nodes.forEach(e => drawConnectionArc(e));
            //nodes.forEach(e => drawAngleLimits(e));
            //nodes.forEach(e => drawNodeFrame(e));
        }},
        {group: "leftHead",     draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(0, 255, 255)"}); }}, 
        {group: "rightHead",    draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(255, 0, 255)"}); }}, 
        {group: "BodyEdge",         draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(255, 255, 0)"}); }}, 
        {group: "rightFin",     draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(255, 0, 0)"}); }}, 
        {group: "leftFin",      draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(0, 0, 255)"}); }}, 
        {group: "tailFin",      draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(0, 255, 0)"}); }}, 
        {group: "spine",        draw: (nodes) => { drawSmoothCurve(nodes.map(e => e.coordinate), {color: "rgb(128, 128, 128)"}); }}
    ];
    */

    const textures = [       
        {groups: ["all"], draw: (groupData) => {
            groupData.forEach(({ group, nodes }) => { nodes.forEach(e => {
                //drawConnectionArc(e);
                //drawAngleLimits(e);
                //drawNodeFrame(e);
            })});
        }},
        {groups: ["rightBodyEdge", "spine", "leftBodyEdge", "tailFin"], draw: (groupData) => { drawFishBody(groupData); }},
        {groups: ["rightFin", "rightFinEdge"], draw: (groupData) => { drawFishRightFin(groupData); }},
        {groups: ["leftFin", "leftFinEdge"], draw: (groupData) => { drawFishLeftFin(groupData); }},
        {groups: ["tailFin", "tailFinEdge"], draw: (groupData) => { drawFishTailFin(groupData); }},
        {groups: ["head", "rightHeadEdge", "leftHeadEdge"], draw: (groupData) => { drawFishHead(groupData); }},
        {groups: ["spine"], draw: (groupData) => {
            groupData.forEach(({ group, nodes }) => { nodes.forEach(e => { 
                //drawConnectionArc(e); 
                //drawAngleLimits(e);
                //drawNodeFrame(e);
            })})
        }}


    ];
    textures.forEach(texture => {
        const groupData = [];
        texture.groups.forEach(g => {
            groupData.push({group: g, nodes: nodes.filter(e => e.groups.includes(g))})
        });

        texture.draw(groupData);
    });

    requestAnimationFrame(update);
}

requestAnimationFrame(update);