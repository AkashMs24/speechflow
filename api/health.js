// Health Check API
// ================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
}
