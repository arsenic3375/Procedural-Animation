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

    crossProduct(a) {
        return a.x*this.y-a.y*this.x;
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

//AI
class Gradient {
    constructor(type, geometry, stops, { center = new Point(0, 0), angle = 0, squash = 1 } = {}) {
        this.type = type;          // "radial" | "linear"
        this.geometry = geometry;  // radial: {inner, outer}  linear: {x0, y0, x1, y1}
        this.stops = stops;        // [[offset, color], ...]
        this.center = center;
        this.angle = angle;
        this.squash = squash;
    }

    static radial(inner, outer, stops, frame) {
        return new Gradient("radial", { inner, outer }, stops, frame);
    }

    static linear(x0, y0, x1, y1, stops, frame) {
        return new Gradient("linear", { x0, y0, x1, y1 }, stops, frame);
    }

    // Elliptical radial gradient: major axis rx along `angle`, minor axis ry across it
    static elliptical(center, angle, rx, ry, stops, innerRatio = 0) {
        return Gradient.radial(innerRatio * rx, rx, stops, { center, angle, squash: ry / rx });
    }

    get edgeColor() {
        return this.stops[this.stops.length - 1][1];
    }

    // Builds the CanvasGradient using the currently active transform
    build() {
        const g = this.geometry;
        const grad = this.type === "linear"
            ? ctx.createLinearGradient(g.x0, g.y0, g.x1, g.y1)
            : ctx.createRadialGradient(0, 0, g.inner, 0, 0, g.outer);
        this.stops.forEach(([offset, color]) => grad.addColorStop(offset, color));
        return grad;
    }

    // Fills inside the gradient's frame, then restores the transform.
    //   fill()       -> fills the current path (path built outside, only the gradient is stretched)
    //   fill(shape)  -> shape() draws inside the frame (the shape itself is stretched too)
    fill(shape = null) {
        ctx.save();
        ctx.translate(this.center.x, this.center.y);
        ctx.rotate(this.angle);
        ctx.scale(1, this.squash);
        ctx.fillStyle = this.build();
        if (shape) shape(); else ctx.fill();
        ctx.restore();
    }
}
//AI

//Rig Functions
function createLeg(groups, length, startRadius, endRadius) {
    if(length <= 1) {
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(startRadius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], groups)),
            new Connection(startRadius, (2/2)*Math.PI, (2/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], groups)), 
            new Connection(startRadius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], groups))
        ], ["all"]);
    }

    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(startRadius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], groups)), 
        new Connection(20, (5/6)*Math.PI, (7/6)*Math.PI, createLeg(groups, length-1, startRadius + (endRadius-startRadius) / (length - 1), endRadius)), 
        new Connection(startRadius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], groups))
    ], ["all"]);
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
            new Connection(radius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightBodyEdge"])),
            new Connection(20, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(length, midpoint, position + 1, startRadius, middleRadius, endRadius)),
            new Connection(radius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftBodyEdge"]))

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

function createDorsalFin(root, start, end, radius = 15) {
    const spine = [];
    for (const { node } of root.traverse()) {
        if (node.groups.includes("spine")) spine.push(node);
    }

    spine.slice(start, end + 1).forEach(node => {
        node.connections.push(new Connection(radius, (5/6)*Math.PI, (7/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "dorsalFinEdge"])));
        node.groups.push("dorsalFin");
    });
}

function createWhisker(group, length, startRadius, endRadius) {
    if(length <= 1) {
        return new Node(new Point(0, 0), new Vector(1, 0), [
            new Connection(startRadius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", `${group}WhiskerEdge`])),
            new Connection(startRadius, (2/2)*Math.PI, (2/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all",`${group}WhiskerEdge`])), 
            new Connection(startRadius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", `${group}WhiskerEdge`]))
        ], ["all", `${group}Whisker`]);
    }

    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(startRadius, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", `${group}WhiskerEdge`])), 
        new Connection(startRadius, (5/6)*Math.PI, (7/6)*Math.PI, createWhisker(group, length-1, startRadius + (endRadius-startRadius) / (length - 1), endRadius)), 
        new Connection(startRadius, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", `${group}WhiskerEdge`]))
    ], ["all", `${group}Whisker`]);
}  

function createFishHead() {
    return new Node(new Point(0, 0), new Vector(1, 0), [
        new Connection(25, 0, 0, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        new Connection(25, (1/6)*Math.PI, (1/6)*Math.PI, createWhisker("right", 3, 2, 1)),
        new Connection(25, (1/6)*Math.PI, (1/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge", "rightMouthCorner"])),
        new Connection(25, (1/2)*Math.PI, (1/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        
        new Connection(30, (2/3)*Math.PI, (2/3)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        new Connection(29, (3/4)*Math.PI, (3/4)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        new Connection(28, (4/5)*Math.PI, (4/5)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        new Connection(27, (5/6)*Math.PI, (5/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        new Connection(26, (6/7)*Math.PI, (6/7)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        new Connection(25, (7/8)*Math.PI, (7/8)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),

        new Connection(20, Math.PI, Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "rightHeadEdge"])),
        
        new Connection(15, (11/12)*Math.PI, (13/12)*Math.PI, createFishBody(10, 2, 0, 25, 30, 5)),
        
        new Connection(20, Math.PI, Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"])),

        new Connection(25, (9/8)*Math.PI, (9/8)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"])),
        new Connection(26, (8/7)*Math.PI, (8/7)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"])),
        new Connection(27, (7/6)*Math.PI, (7/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"])),
        new Connection(28, (6/5)*Math.PI, (6/5)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"])),
        new Connection(29, (5/4)*Math.PI, (5/4)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"])),
        new Connection(30, (4/3)*Math.PI, (4/3)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"])),

        new Connection(25, (3/2)*Math.PI, (3/2)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"])),
        new Connection(25, (11/6)*Math.PI, (11/6)*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge", "leftMouthCorner"])),
        new Connection(25, (11/6)*Math.PI, (11/6)*Math.PI, createWhisker("left", 3, 2, 1)),
        new Connection(25, 2*Math.PI, 2*Math.PI, new Node(new Point(0, 0), new Vector(1, 0), [], ["all", "leftHeadEdge"]))

    ], ["all", "head"]);
}

function createFish() {
    let root = new Node(new Point(0, 0), new Vector(1, 0), [new Connection(20, (0/6)*Math.PI, (12/6)*Math.PI, createFishHead())], ["all"])
    createDorsalFin(root, 1, 4);
    return root;
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

function drawSmoothCurve(points, {color = "rgb(255, 255, 255)", width = 1, cap = "round", tau = 0.5, samples = 8} = {}) {
    const smooth = interpolatePoints(points, samples, tau);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = cap;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(smooth[0].x, smooth[0].y);
    for (let i = 1; i < smooth.length; i++) {
        ctx.lineTo(smooth[i].x, smooth[i].y);
    }
    ctx.stroke();

    ctx.restore();
}

function drawSmoothCurveGradient(points, {color1 = "rgb(255, 255, 255)", color2 = "rgb(255, 255, 255)", width = 1, tau = 0.5, samples = 8} = {}) {
    const smooth = interpolatePoints(points, samples, tau);
    const c1 = color1.match(/\d+/g).map(Number);
    const c2 = color2.match(/\d+/g).map(Number);
    const lerp = (k, t) => c1[k] + (c2[k] - c1[k]) * t;

    ctx.save();
    ctx.lineWidth = width;
    ctx.lineCap = "round";

    for (let i = 1; i < smooth.length; i++) {
        const t = i / smooth.length;
        ctx.beginPath();
        ctx.moveTo(smooth[i - 1].x, smooth[i - 1].y);
        ctx.lineTo(smooth[i].x, smooth[i].y);
        ctx.strokeStyle = `rgb(${lerp(0, t)}, ${lerp(1, t)}, ${lerp(2, t)})`;
        ctx.stroke();
    }

    ctx.restore();
}

function drawFilledArea(points, {color = "rgb(255, 255, 255)", gradient = null, tau = 0.5, samples = 8} = {}) {
    const smooth = interpolatePoints(points, samples, tau);

    ctx.beginPath();
    ctx.moveTo(smooth[0].x, smooth[0].y);
    for (let i = 1; i < smooth.length; i++) {
        ctx.lineTo(smooth[i].x, smooth[i].y);
    }
    ctx.closePath();

    if (gradient) {
        gradient.fill();
    } else {
        ctx.fillStyle = color;
        ctx.fill();
    }
}

const SCALE_PARTS = {
    left:   { top:  0, bottom: 1, arcStart: 0,             arcEnd: Math.PI / 2 },
    middle: { top: -1, bottom: 1, arcStart: -Math.PI / 2,  arcEnd: Math.PI / 2 },
    right:  { top: -1, bottom: 0, arcStart: -Math.PI / 2,  arcEnd: 0 },
};

function drawScale(p, d, r1, r2, color1, color2, rowType, side) {
    const part = SCALE_PARTS[side];
    if (!part || r1 < 0.5 || r2 < 0.5) return;

    const frame = { center: p, angle: d, squash: r2 / r1 };

    if (rowType === "middle") {
        Gradient.linear(0, -r1, 0, r1, [
            [0,    color2],
            [0.25, color1],
            [0.75, color1],
            [1,    color2],
        ], frame).fill(() => {
            ctx.fillRect(-r1, part.top * r1, r1 + 1, (part.bottom - part.top) * r1);
        });
    }

    Gradient.radial(0.5 * r1, r1, [
        [0, color1],
        [1, color2],
    ], frame).fill(() => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r1, part.arcStart, part.arcEnd);
        ctx.closePath();
        ctx.fill();
    });
}

function buildPointGrid(right, middle, left) {
    const rightPts  = interpolatePoints(right, 4, 0.5);
    const middlePts = interpolatePoints(middle, 4, 0.5);
    const leftPts   = interpolatePoints(left, 4, 0.5);
    const n = middlePts.length;

    return middlePts.map((mid, i) =>
        interpolatePoints([rightPts[i], mid, leftPts[n - i - 1]], 3, 0.5)
    );
}

function drawScaleGrid(grid) {
    for (let i = grid.length - 2; i >= 0; i--) {
        const row = grid[i];
        const next = grid[i + 1];
        const rowType = i === 0 ? "front" : "middle";

        let log = [];
        for (let j = 0; j < row.length; j++) {
            const t = 1-Math.abs(2*j/(row.length-1)-1);
            log[j] = t;
            const [color1, color2] = [`rgb(255, ${64 + 64 * t}, 0)`, `rgb(255, ${128 + 64 * t}, 0)`];

            if ((i + j) % 2 !== 0) continue;

            const side = j === 0 ? "left" : j === row.length - 1 ? "right" : "middle";
            const neighbor = side === "right" ? row[j - 1] : row[j + 1];

            const p = row[j];
            const along = p.difference(next[j]);

            drawScale(p, along.angle(), along.magnitude(),
                       p.difference(neighbor).magnitude(),
                       color1, color2, rowType, side);
        }
        //console.log(log)
    }
}

function drawFishBody(groupData) {
    const get = name => groupData.find(e => e.group === name).nodes;

    const right = get("rightBodyEdge").map(e => e.coordinate);
    const left  = get("leftBodyEdge").map(e => e.coordinate);
    const tail  = get("tailFin").map(e => e.coordinate);

    const spine = get("spine");

    drawFilledArea(right.concat(tail).concat(left), {color: "rgb(255, 64, 0)"});
    
    const gradient = Gradient.elliptical(
        spine.at(-1).coordinate, spine.at(-1).direction.angle(), 5, 5,
        [[0, "rgb(255, 160, 0)"], [1, "rgb(255, 64, 0)"]]
    );

    drawFilledArea([right.at(-1)].concat(tail).concat(left.at(0)), { gradient });
    
    drawScaleGrid(buildPointGrid(right, spine.map(e => e.coordinate), left));

    drawSmoothCurve(right.concat(tail), {color: "rgb(255, 64, 0)", width: 2});
    drawSmoothCurve(tail.concat(left).reverse(), {color: "rgb(255, 64, 0)", width: 2})
    //drawSmoothCurveGradient(right.concat(tail), { color1: "rgb(255, 64, 0)", color2: "rgb(255, 192, 0)" });
    //drawSmoothCurveGradient(tail.concat(left).reverse(), { color1: "rgb(255, 64, 0)", color2: "rgb(255, 192, 0)" });
}

//Abbot Understanding Anlysis
//Linear Algebra Done right


function drawFishRightFin(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;
    let finPoints = interpolatePoints(get("rightFinEdge").map(e => e.coordinate), 3, 0.5);
    let anchor = get("rightFin").map(e => e.coordinate);
    finPoints.forEach(e => {
        drawSmoothCurve(anchor.concat(e), {color: "rgb(255, 0, 0)", width: 1});
    });
    drawSmoothCurve(get("rightFinEdge").map(e => e.coordinate), {color: "rgb(255, 0, 0)", width: 2});
}

function drawFishLeftFin(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;
    let finPoints = interpolatePoints(get("leftFinEdge").map(e => e.coordinate), 3, 0.5);
    let anchor = get("leftFin").map(e => e.coordinate);
    finPoints.forEach(e => {
        drawSmoothCurve(anchor.concat(e), {color: "rgb(255, 0, 0)", width: 1});
    });
    drawSmoothCurve(get("leftFinEdge").map(e => e.coordinate), {color: "rgb(255, 0, 0)", width: 2});
}

function drawFishTailFin(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;
    let finPoints = interpolatePoints(get("tailFinEdge").map(e => e.coordinate), 3, 0.5);
    let anchor = get("tailFin").map(e => e.coordinate);
    finPoints.forEach(e => {
        drawSmoothCurve(anchor.concat(e), {color: "rgb(255, 0, 0)", width: 1});
    });
    drawSmoothCurve(get("tailFinEdge").map(e => e.coordinate), {color: "rgb(255, 0, 0)", width: 2});
}

function drawFishDorsalFin(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;
    const base = get("dorsalFin").map(e => e.coordinate);
    const edge = get("dorsalFinEdge").map(e => e.coordinate);
    
    const basePoints = interpolatePoints(base, 3, 0.5);
    const edgePoints = interpolatePoints(edge, 3, 0.5).reverse();

    for(let i = 0; i < basePoints.length; i++) {
        drawSmoothCurve([basePoints[i]].concat([edgePoints[i]]), { color: "rgb(0, 255, 255)", width: 1 }); 
    }
    drawSmoothCurve(base, { color: "rgb(0, 255, 255)", width: 1 });
    drawSmoothCurve([base.at(-1)].concat(edge).concat([base.at(0)]), { color: "rgb(0, 255, 255)", width: 2 });
}

function drawFishHead(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;

    const left  = get("leftHeadEdge").map(e => e.coordinate);
    const right = get("rightHeadEdge").map(e => e.coordinate);
    const head  = get("head")[0];

    const gradient = Gradient.elliptical(
        head.coordinate.sum(head.direction.scale(-20)), head.direction.angle(), 45, 25,
        [[0, "rgb(255, 128, 0)"], [1, "rgb(255, 0, 0)"]]
    );

    drawFilledArea(left.concat(right), { gradient });
}

function drawFishMouth(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;

    const head  = get("head")[0];
    const leftMouthCorner = get("leftMouthCorner").map(e => e.coordinate)[0];
    const rightMouthCorner = get("rightMouthCorner").map(e => e.coordinate)[0]; 

    const vc = head.coordinate.sum(head.direction.scale(15));

    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgb(255,0,64)";
    ctx.fillStyle = "rgb(224,0,64)";

    ctx.beginPath();
    ctx.arc(vc.x, vc.y, 14, (10/6)*Math.PI+head.direction.angle(), (2/6)*Math.PI+head.direction.angle())
    ctx.fill();
    ctx.stroke();
}

function drawFishWhiskers(groupData) {
    const get = name => groupData.find(e => e.group === name)?.nodes;

    drawFilledArea(get("leftWhiskerEdge").map(e => e.coordinate), { color: "rgb(255,0,64)" } );
    drawFilledArea(get("rightWhiskerEdge").map(e => e.coordinate), { color: "rgb(255,0,64)" } );
 
}

function drawLeg(groupData, name, color, width = 1) {
    const get = name => groupData.find(e => e.group === name)?.nodes;
    drawSmoothCurve(get(name).map(e => e.coordinate), {color: color, width: width});
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
    root.coordinate = brain.coordinate;
    //root.coordinate = mouse;
    root.constrain();

    const nodesOcto = [];
    for (const { node } of root.traverse()) {
        nodesOcto.push(node);
    }

    const texOcto = [
        {groups: ["all"], draw: (groupData) => {
            groupData.forEach(({ group, nodes }) => { nodes.forEach(e => {
                drawConnectionArc(e);
                drawAngleLimits(e);
                drawNodeFrame(e);
            })});
        }}, 
        {groups: ["one"], draw: (groupData) => { drawLeg(groupData, "one", "rgb(255, 0, 0)") }}, 
        {groups: ["two"], draw: (groupData) => { drawLeg(groupData, "two", "rgb(255, 128, 0)") }}, 
        {groups: ["three"], draw: (groupData) => { drawLeg(groupData, "three", "rgb(255, 255, 0)") }}, 
        {groups: ["four"], draw: (groupData) => { drawLeg(groupData, "four", "rgb(128, 255, 0)") }}, 
        {groups: ["five"], draw: (groupData) => { drawLeg(groupData, "five", "rgb(0, 255, 128)") }}, 
        {groups: ["six"], draw: (groupData) => { drawLeg(groupData, "six", "rgb(0, 255, 255)") }}, 
        {groups: ["seven"], draw: (groupData) => { drawLeg(groupData, "seven", "rgb(0, 0, 255)") }}, 
        {groups: ["eight"], draw: (groupData) => { drawLeg(groupData, "eight", "rgb(128, 0, 255)") }},

    ];

    texOcto.forEach(texture => {
        const groupData = [];
        texture.groups.forEach(g => {
            groupData.push({group: g, nodes: nodesOcto.filter(e => e.groups.includes(g))})
        });

        texture.draw(groupData);
    });
    */
    
    fishBrain.smooth_random_walk(t);
    fish.coordinate = mouse;
    fish.constrain();

    const nodes = [];
    for (const { node } of fish.traverse()) {
        nodes.push(node);
    }

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
        {groups: ["dorsalFin", "dorsalFinEdge"], draw: (groupData) => { drawFishDorsalFin(groupData); }},
        {groups: ["leftWhisker", "rightWhisker", "leftWhiskerEdge", "rightWhiskerEdge"], draw: (groupData) => { drawFishWhiskers(groupData); }},
        {groups: ["head", "leftMouthCorner", "rightMouthCorner"], draw: (groupData) => { drawFishMouth(groupData); }},
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