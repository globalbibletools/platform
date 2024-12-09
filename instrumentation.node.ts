import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk'
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray'
import { Resource } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

console.log('Sending tracing to', process.env['OTEL_EXPORTER_OTLP_ENDPOINT'])

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
        new AwsInstrumentation({ suppressInternalInstrumentation: true })
    ],
    spanProcessor,
    traceExporter
})

sdk.start()

process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
});
