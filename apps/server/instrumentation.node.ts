import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray'
import { Resource } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

console.log('Starting tracing')

// Uncomment to view what would be sent to otel collector
// diag.setLogger(new DiagConsoleLogger(), {
//     logLevel: DiagLogLevel.ALL
// })

const resource = new Resource({
    [ATTR_SERVICE_NAME]: 'platform-server',
})

const traceExporter = new OTLPTraceExporter()
const spanProcessor = new SimpleSpanProcessor(traceExporter)

const sdk = new NodeSDK({
    textMapPropagator: new AWSXRayPropagator(),
    resource,
    idGenerator: new AWSXRayIdGenerator(),
    instrumentations: [
        new AwsInstrumentation({ suppressInternalInstrumentation: true }),
        new HttpInstrumentation(),
        new PgInstrumentation()
    ],
    spanProcessor,
    traceExporter,
})

sdk.start()

process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
});
