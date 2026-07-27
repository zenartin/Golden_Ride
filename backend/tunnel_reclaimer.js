const localtunnel = require('localtunnel');

async function startTunnel() {
    console.log("Attempting to claim golden-ride-backend-api...");
    try {
        const tunnel = await localtunnel({ port: 8000, subdomain: 'golden-ride-backend-api', local_host: '127.0.0.1' });
        
        console.log(`Tunnel started at: ${tunnel.url}`);
        
        if (!tunnel.url.includes('golden-ride-backend-api')) {
            console.log("Got wrong subdomain! Closing and retrying in 5 seconds...");
            tunnel.close();
            setTimeout(startTunnel, 5000);
        } else {
            console.log("SUCCESS! Claimed golden-ride-backend-api. Tunnel is now active.");
            
            tunnel.on('close', () => {
                console.log("Tunnel closed. Restarting...");
                setTimeout(startTunnel, 1000);
            });
            
            tunnel.on('error', (err) => {
                console.error("Tunnel error:", err);
            });
        }
    } catch (err) {
        console.error("Error starting tunnel:", err);
        setTimeout(startTunnel, 5000);
    }
}

startTunnel();
