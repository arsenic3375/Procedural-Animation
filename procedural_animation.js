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
        new Connection(30, (7/6)*Math.PI, (8/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightFin"])),
        new Connection(30, (15/12)*Math.PI, (9/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightFin"]))
    ], ["all", "rightFin"]);
}

function createFishLeftFin() {
    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(30, (3/6)*Math.PI, (11/12)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftFin"])),
        new Connection(30, (4/6)*Math.PI, (5/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftFin"]))
    ], ["all", "leftFin"]);
}

function createFishTailFin() {
    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(50, (5/6)*Math.PI, (89/90)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "tailFin"])),
        new Connection(50, (91/90)*Math.PI, (7/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "tailFin"]))
    ], ["all"]);
}

function createFishBody(length, midpoint, position, startRadius, middleRadius, endRadius) {
    if(position == length-1) {
        const radius = endRadius;
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body"])),
            new Connection(radius, (2/2)*Math.PI, (2/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body", "tailFin"])),
            new Connection(radius, Math.PI, Math.PI, createFishTailFin()),
            new Connection(radius, (2/2)*Math.PI, (2/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body", "tailFin"])),
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body"]))
        ], ["all", "spine"]);
    }

    if(position == 0) {
        const radius = startRadius;
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body", "rightHead"])),
            new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(length, midpoint, position + 1, startRadius, middleRadius, endRadius)),
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body", "leftHead"]))
        ], ["all", "spine"]);
    }
    
    if(position < midpoint) {
        const radius = startRadius + position * (middleRadius-startRadius)/(midpoint);
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body"])),
            new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(length, midpoint, position + 1, startRadius, middleRadius, endRadius)), 
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body"]))
        ], ["all", "spine"]);
    }

    if(position == midpoint) {
        const radius = middleRadius;
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body", "rightFin"])),
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, createFishRightFin()),
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body", "rightFin"])),

            new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(length, midpoint, position + 1, startRadius, middleRadius, endRadius)), 
            
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body", "leftFin"])),
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, createFishLeftFin()),
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body", "leftFin"]))
        ], ["all", "spine"]);
    }

    if(position > midpoint) {
        const radius = middleRadius + (position - midpoint) * (endRadius-middleRadius)/(length-midpoint);
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body"])),
            new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(length, midpoint, position + 1, startRadius, middleRadius, endRadius)), 
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "body"]))
        ], ["all", "spine"]);
    }
}

function createFishHead() {
    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(20, 0, 0, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHead"])),
        new Connection(20, (1/6)*Math.PI, (1/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHead"])),
        new Connection(20, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHead"])),
        new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(12, 2, 0, 25, 30, 5)),
        new Connection(20, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHead"])),
        new Connection(20, (11/6)*Math.PI, (11/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHead"])),
        new Connection(20, 2*Math.PI, 2*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHead"]))
    ], ["all"]);
}

function createFish() {
    return new Node(new Point(0, 0), new Vector(1, 0), [new Connection(20, (0/6)*Math.PI, (12/6)*Math.PI, createFishHead())], ["all"])
}

//Texture Functions

//Final Texures
function drawFishRightFin() {}
function drawFishLeftFin() {}
function drawFishBody() {}
function drawFishTailFin() {}

//Test Textures
function drawSmoothCurve(points, {color = "rgb(255, 255, 255)", tension = 1} = {}) {
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[0];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
        const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
        const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
        const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.stroke();
}

function drawFilledArea(points, {color = "rgb(255, 255, 255)", tension = 1} = {}) {
    if (points.length < 2) return;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[0];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
        const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
        const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
        const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.fill();
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

    const textures = [       
        {group: "all",          draw: (nodes) => { 
            //nodes.forEach(e => drawConnectionArc(e));
            //nodes.forEach(e => drawAngleLimits(e));
            //nodes.forEach(e => drawNodeFrame(e));
        }},
        {group: "leftHead",     draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(0, 255, 255)"}); }}, 
        {group: "rightHead",    draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(255, 0, 255)"}); }}, 
        {group: "body",         draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(255, 255, 0)"}); }}, 
        {group: "rightFin",     draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(255, 0, 0)"}); }}, 
        {group: "leftFin",      draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(0, 0, 255)"}); }}, 
        {group: "tailFin",      draw: (nodes) => { drawFilledArea(nodes.map(e => e.coordinate), {color: "rgb(0, 255, 0)"}); }}, 
        {group: "spine",        draw: (nodes) => { drawSmoothCurve(nodes.map(e => e.coordinate), {color: "rgb(128, 128, 128)"}); }}
    ];

    textures.forEach(texture => {
        texture.draw(nodes.filter(e => e.groups.includes(texture.group)));
    });

    requestAnimationFrame(update);
}

requestAnimationFrame(update);