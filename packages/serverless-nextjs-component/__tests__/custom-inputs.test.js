const path = require("path");
const execa = require("execa");
const { mockDomain } = require("@serverless/domain");
const { mockS3 } = require("@serverless/aws-s3");
const { mockLambda, mockLambdaPublish } = require("@serverless/aws-lambda");
const { mockCloudFront } = require("@serverless/aws-cloudfront");
const NextjsComponent = require("../serverless");

jest.mock("execa");

describe("Custom domain", () => {
  let tmpCwd;
  let componentOutputs;

  const fixturePath = path.join(__dirname, "./fixtures/generic-fixture");

  beforeEach(async () => {
    execa.mockResolvedValueOnce();

    tmpCwd = process.cwd();
    process.chdir(fixturePath);

    mockS3.mockResolvedValue({
      name: "bucket-xyz"
    });
    mockLambda.mockResolvedValue({
      arn: "arn:aws:lambda:us-east-1:123456789012:function:my-func"
    });
    mockLambdaPublish.mockResolvedValue({
      version: "v1"
    });
    mockCloudFront.mockResolvedValueOnce({
      url: "https://cloudfrontdistrib.amazonaws.com"
    });
    mockDomain.mockResolvedValueOnce({
      domains: ["https://www.example.com"]
    });

    const component = new NextjsComponent();
    componentOutputs = await component.default({
      policy: "arn:aws:iam::aws:policy/CustomRole",
      domain: ["www", "example.com"]
    });
  });

  afterEach(() => {
    process.chdir(tmpCwd);
  });

  it("uses @serverless/domain to provision custom domain", async () => {
    expect(mockDomain).toBeCalledWith({
      privateZone: false,
      domain: "example.com",
      subdomains: {
        www: {
          url: "https://cloudfrontdistrib.amazonaws.com"
        }
      }
    });
  });

  it("uses custom policy document provided", () => {
    expect(mockLambda).toBeCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("Default Lambda@Edge"),
        role: expect.objectContaining({
          policy: {
            arn: "arn:aws:iam::aws:policy/CustomRole"
          }
        })
      })
    );

    expect(mockLambda).toBeCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("API Lambda@Edge"),
        role: expect.objectContaining({
          policy: {
            arn: "arn:aws:iam::aws:policy/CustomRole"
          }
        })
      })
    );
  });

  it("outputs custom domain url", async () => {
    expect(componentOutputs.appUrl).toEqual("https://www.example.com");
  });
});
